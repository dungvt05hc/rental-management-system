using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Security;
using RentalManagement.Api.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of authentication and user management services
/// Handles user registration, login, JWT token generation, and user management operations
/// </summary>
public class AuthService : IAuthService
{
    /// <summary>
    /// Dùng khi FRONTEND_URL chưa được đặt — đúng cổng mà ./dev.sh chạy frontend.
    /// </summary>
    private const string DefaultFrontendBaseUrl = "http://localhost:3000";

    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly IInvitationService _invitationService;
    private readonly DataProtectionTokenProviderOptions _tokenProviderOptions;
    private readonly EmailConfirmationTokenProviderOptions _emailConfirmationTokenOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper,
        IConfiguration configuration,
        IEmailService emailService,
        IInvitationService invitationService,
        IOptions<DataProtectionTokenProviderOptions> tokenProviderOptions,
        IOptions<EmailConfirmationTokenProviderOptions> emailConfirmationTokenOptions,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _mapper = mapper;
        _configuration = configuration;
        _emailService = emailService;
        _invitationService = invitationService;
        _tokenProviderOptions = tokenProviderOptions.Value;
        _emailConfirmationTokenOptions = emailConfirmationTokenOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a user with email and password
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto loginRequest)
    {
        var user = await _userManager.FindByEmailAsync(loginRequest.Email);
        if (user is null)
        {
            _logger.LogWarning("Login attempt with non-existent email: {Email}", loginRequest.Email);
            return ApiResponse<AuthResponseDto>.ErrorResponse("Invalid email or password");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login attempt with inactive user: {Email}", loginRequest.Email);
            return ApiResponse<AuthResponseDto>.ErrorResponse("User account is inactive");
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, loginRequest.Password, lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            _logger.LogWarning("Failed login attempt for user: {Email}", loginRequest.Email);

            if (result.IsLockedOut)
                return ApiResponse<AuthResponseDto>.ErrorResponse("Account is locked out");

            return ApiResponse<AuthResponseDto>.ErrorResponse("Invalid email or password");
        }

        // Kiểm tra sau khi mật khẩu đã đúng, không phải trước: đặt trước thì bất
        // kỳ ai cũng phân biệt được "địa chỉ này có tài khoản chưa xác nhận" với
        // "địa chỉ này không tồn tại", chỉ bằng cách gõ một mật khẩu bừa.
        if (!user.EmailConfirmed)
        {
            _logger.LogWarning("Login blocked for unconfirmed email: {Email}", loginRequest.Email);
            return ApiResponse<AuthResponseDto>.ErrorResponse(
                "Your email address has not been confirmed yet. "
                + "Use the link we emailed you, or request a new one.");
        }

        var token = await GenerateJwtTokenAsync(user);
        var userDto = await MapUserToDtoAsync(user);

        _logger.LogInformation("User logged in successfully: {Email}", loginRequest.Email);

        return ApiResponse<AuthResponseDto>.SuccessResponse(new AuthResponseDto
        {
            Token = token,
            User = userDto,
            ExpiresAt = DateTime.UtcNow.AddHours(GetTokenExpirationHours())
        }, "Login successful");
    }

    /// <summary>
    /// Registers a new user from a valid invitation code
    /// </summary>
    public async Task<ApiResponse<SelfRegisterResultDto>> RegisterAsync(
        SelfRegisterDto request, CancellationToken ct = default)
    {
        var email = request.Email.Trim();

        if (await _userManager.FindByEmailAsync(email) is not null)
        {
            // Endpoint này ẩn danh nên câu trả lời này lộ ra địa chỉ nào đã có
            // tài khoản. Đó là đánh đổi có ý thức: không nói thì người dùng thật
            // gõ lại mật khẩu vài lần rồi vẫn không hiểu vì sao không vào được,
            // và /auth/check-email ngay cạnh cũng đã trả lời đúng câu hỏi ấy.
            // Cái giữ cho nó không thành máy quét là rate limit theo IP.
            return ApiResponse<SelfRegisterResultDto>.ErrorResponse(
                "An account with this email address already exists. Sign in instead, "
                + "or reset your password.");
        }

        // Giữ chỗ mã mời TRƯỚC khi tạo user. Ngược lại thì hai người cùng cầm
        // một mã sẽ tạo ra hai tài khoản rồi mới phát hiện mã chỉ dùng được một
        // lần, mà lúc đó tài khoản đã tồn tại.
        var invitation = await _invitationService.TryClaimAsync(request.InvitationCode, email, ct);

        if (invitation is null)
        {
            _logger.LogWarning("Registration attempt with an unusable invitation code for {Email}", email);

            // Một thông điệp chung cho mọi lý do: mã sai, hết hạn, đã dùng, đã
            // thu hồi, hoặc mã dành cho địa chỉ khác. Tách ra là biến endpoint
            // này thành công cụ dò xem mã nào từng tồn tại.
            return ApiResponse<SelfRegisterResultDto>.ErrorResponse(
                "This invitation code is not valid. It may have expired, been used already, "
                + "or been issued for a different email address.");
        }

        var user = _mapper.Map<User>(request);

        // Tài khoản có role ngay, nhưng chưa xác nhận email thì LoginAsync vẫn
        // chặn — nên IsActive ở đây không phải là "đã dùng được".
        user.EmailConfirmed = false;
        user.IsActive = true;

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            await _invitationService.ReleaseClaimAsync(invitation.Id, ct);

            var errors = result.Errors.Select(e => e.Description).ToArray();
            _logger.LogWarning("Registration failed for {Email}: {Errors}", email, string.Join(", ", errors));

            return ApiResponse<SelfRegisterResultDto>.ErrorResponse("Registration failed", errors);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, invitation.Role);

        if (!roleResult.Succeeded)
        {
            // Tài khoản không role là tài khoản đăng nhập được mà không làm được
            // gì, và mã mời thì đã tiêu. Dọn sạch để người dùng thử lại được với
            // đúng mã đó.
            _logger.LogError(
                "Role {Role} could not be assigned to new user {Email}: {Errors}",
                invitation.Role, email, string.Join(", ", roleResult.Errors.Select(e => e.Description)));

            await _userManager.DeleteAsync(user);
            await _invitationService.ReleaseClaimAsync(invitation.Id, ct);

            return ApiResponse<SelfRegisterResultDto>.ErrorResponse(
                "Registration could not be completed. Please try again.");
        }

        await _invitationService.ConfirmClaimAsync(invitation.Id, user.Id, ct);

        _logger.LogInformation(
            "User {UserId} registered with role {Role} from invitation {InvitationId}",
            user.Id, invitation.Role, invitation.Id);

        await SendEmailConfirmationLinkAsync(user, ct);

        return ApiResponse<SelfRegisterResultDto>.SuccessResponse(
            new SelfRegisterResultDto { Email = email },
            "Account created. Check your inbox for the link that confirms your email address.");
    }

    /// <summary>
    /// Confirms an email address using the token from the emailed link
    /// </summary>
    public async Task<ApiResponse<bool>> ConfirmEmailAsync(ConfirmEmailDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            _logger.LogWarning(
                "Email confirmation attempted for an unknown address: {Email}", request.Email);
            return InvalidConfirmationTokenResponse();
        }

        if (user.EmailConfirmed)
        {
            // Bấm lại link cũ không phải lỗi. Báo lỗi ở đây làm người dùng tưởng
            // tài khoản có vấn đề trong khi họ đã xong việc từ lần bấm trước.
            return ApiResponse<bool>.SuccessResponse(
                true, "Your email address is already confirmed. You can sign in.");
        }

        var result = await _userManager.ConfirmEmailAsync(user, request.Token);

        if (!result.Succeeded)
        {
            _logger.LogWarning(
                "Email confirmation for user {UserId} rejected: {Errors}",
                user.Id, string.Join(", ", result.Errors.Select(e => e.Code)));
            return InvalidConfirmationTokenResponse();
        }

        _logger.LogInformation("Email confirmed for user {UserId}", user.Id);

        return ApiResponse<bool>.SuccessResponse(
            true, "Your email address is confirmed. You can sign in now.");
    }

    /// <summary>
    /// Emails another confirmation link to an account still waiting for confirmation
    /// </summary>
    public async Task ResendEmailConfirmationAsync(
        ResendConfirmationDto request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Không có tài khoản, đã xác nhận rồi, hoặc tài khoản bị khoá: dừng im
        // lặng, đúng như luồng quên mật khẩu và vì cùng lý do — người gọi không
        // được phân biệt các trường hợp này qua phản hồi.
        if (user is null || user.EmailConfirmed || !user.IsActive || string.IsNullOrEmpty(user.Email))
        {
            _logger.LogInformation(
                "Confirmation resend requested for an address with nothing to confirm: {Email}",
                request.Email);
            return;
        }

        await SendEmailConfirmationLinkAsync(user, ct);
    }

    /// <summary>
    /// Tells whether an email address is still free
    /// </summary>
    public async Task<bool> IsEmailAvailableAsync(string email, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return await _userManager.FindByEmailAsync(email.Trim()) is null;
    }

    /// <summary>
    /// Emails a password reset link to the address, if it belongs to an active account
    /// </summary>
    public async Task SendPasswordResetLinkAsync(ForgotPasswordDto request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Không có tài khoản, hoặc tài khoản đã bị khoá: dừng im lặng. Người gọi
        // nhận đúng phản hồi như trường hợp gửi thành công, nên không suy ra
        // được địa chỉ nào đã đăng ký.
        if (user is null || !user.IsActive || string.IsNullOrEmpty(user.Email))
        {
            _logger.LogInformation(
                "Password reset requested for an address with no active account: {Email}",
                request.Email);
            return;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        try
        {
            await _emailService.SendTemplateAsync(
                user.Email,
                EmailTemplate.ResetPassword,
                new
                {
                    user.FullName,
                    ResetLink = BuildFrontendLink("/reset-password", user.Email, token),
                    ExpiryMinutes = (int)_tokenProviderOptions.TokenLifespan.TotalMinutes
                },
                ct);

            _logger.LogInformation("Password reset link queued for user {UserId}", user.Id);
        }
        catch (EmailRateLimitExceededException)
        {
            // Đây là giới hạn theo địa chỉ email. Để ngoại lệ bay lên sẽ thành
            // 429, mà 429 chỉ xuất hiện khi địa chỉ có tài khoản thật — vừa
            // đúng cái oracle mà endpoint này phải tránh. Nuốt ngoại lệ và trả
            // về như mọi lần khác.
            _logger.LogWarning(
                "Password reset email for user {UserId} was suppressed by the per-address rate limit",
                user.Id);
        }
    }

    /// <summary>
    /// Sets a new password using a token from a password reset link
    /// </summary>
    public async Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user is null || !user.IsActive)
        {
            // Cùng thông điệp với token hỏng: địa chỉ lạ và token hỏng không được
            // phân biệt được từ phía người gọi.
            _logger.LogWarning(
                "Password reset attempted for an address with no active account: {Email}",
                request.Email);
            return InvalidResetTokenResponse();
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

        if (!result.Succeeded)
        {
            // Identity trả về cùng mã InvalidToken cho token sai chữ ký, token
            // đã hết hạn và token đã dùng rồi (stamp đã đổi), nên chỉ tách được
            // lỗi mật khẩu ra khỏi lỗi token.
            var passwordErrors = result.Errors
                .Where(e => e.Code.StartsWith("Password", StringComparison.Ordinal))
                .Select(e => e.Description)
                .ToArray();

            if (passwordErrors.Length > 0)
            {
                _logger.LogInformation(
                    "Password reset for user {UserId} rejected by the password policy", user.Id);
                return ApiResponse<bool>.ErrorResponse(
                    "The new password does not meet the password policy", passwordErrors);
            }

            _logger.LogWarning(
                "Password reset for user {UserId} rejected: {Errors}",
                user.Id,
                string.Join(", ", result.Errors.Select(e => e.Code)));

            return InvalidResetTokenResponse();
        }

        // ResetPasswordAsync đã đổi security stamp khi ghi mật khẩu mới; gọi
        // tường minh ở đây để việc "mọi phiên cũ hết hiệu lực" là một bước thấy
        // được của luồng này, không phải tác dụng phụ của Identity.
        await _userManager.UpdateSecurityStampAsync(user);

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        _logger.LogInformation(
            "Password reset completed for user {UserId}; existing sessions invalidated", user.Id);

        return ApiResponse<bool>.SuccessResponse(true, "Your password has been reset");
    }

    /// <summary>
    /// Gets user information by user ID
    /// </summary>
    public async Task<ApiResponse<UserDto>> GetUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return ApiResponse<UserDto>.ErrorResponse("User not found");
        }

        var userDto = await MapUserToDtoAsync(user);
        return ApiResponse<UserDto>.SuccessResponse(userDto);
    }

    /// <summary>
    /// Gets all users in the system
    /// </summary>
    public async Task<ApiResponse<IEnumerable<UserDto>>> GetUsersAsync()
    {
        var users = _userManager.Users.ToList();
        var userDtos = new List<UserDto>();

        foreach (var user in users)
        {
            var userDto = await MapUserToDtoAsync(user);
            userDtos.Add(userDto);
        }

        return ApiResponse<IEnumerable<UserDto>>.SuccessResponse(userDtos);
    }

    /// <summary>
    /// Updates user information
    /// </summary>
    public async Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, RegisterRequestDto updateRequest)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return ApiResponse<UserDto>.ErrorResponse("User not found");
        }

        // Update user properties
        user.FirstName = updateRequest.FirstName;
        user.LastName = updateRequest.LastName;
        user.Email = updateRequest.Email;
        user.UserName = updateRequest.Email;
        user.PhoneNumber = updateRequest.PhoneNumber;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return ApiResponse<UserDto>.ErrorResponse("Update failed", errors);
        }

        var userDto = await MapUserToDtoAsync(user);
        return ApiResponse<UserDto>.SuccessResponse(userDto, "User updated successfully");
    }

    /// <summary>
    /// Deletes a user from the system
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return ApiResponse<bool>.ErrorResponse("User not found");
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return ApiResponse<bool>.ErrorResponse("Delete failed", errors);
        }

        return ApiResponse<bool>.SuccessResponse(true, "User deleted successfully");
    }

    /// <summary>
    /// Assigns a role to a user
    /// </summary>
    public async Task<ApiResponse<bool>> AssignRoleAsync(string userId, string role)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return ApiResponse<bool>.ErrorResponse("User not found");
        }

        if (!await _roleManager.RoleExistsAsync(role))
        {
            return ApiResponse<bool>.ErrorResponse("Role does not exist");
        }

        var result = await _userManager.AddToRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return ApiResponse<bool>.ErrorResponse("Role assignment failed", errors);
        }

        return ApiResponse<bool>.SuccessResponse(true, "Role assigned successfully");
    }

    /// <summary>
    /// Removes a role from a user
    /// </summary>
    public async Task<ApiResponse<bool>> RemoveRoleAsync(string userId, string role)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return ApiResponse<bool>.ErrorResponse("User not found");
        }

        var result = await _userManager.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return ApiResponse<bool>.ErrorResponse("Role removal failed", errors);
        }

        return ApiResponse<bool>.SuccessResponse(true, "Role removed successfully");
    }

    /// <summary>
    /// Sinh token xác nhận email rồi gửi link cho người dùng.
    /// </summary>
    /// <remarks>
    /// Email không gửi được không làm hỏng việc đăng ký: tài khoản đã tạo xong
    /// và mã mời đã tiêu, nên ném lỗi ra ngoài chỉ khiến người dùng thấy đăng ký
    /// thất bại trong khi thật ra đã thành công. Đường thoát là gửi lại link.
    /// </remarks>
    private async Task SendEmailConfirmationLinkAsync(User user, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(user.Email))
        {
            return;
        }

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

        try
        {
            await _emailService.SendTemplateAsync(
                user.Email,
                EmailTemplate.EmailConfirmation,
                new
                {
                    user.FullName,
                    ConfirmationLink = BuildFrontendLink("/confirm-email", user.Email, token),
                    ExpiryHours = (int)_emailConfirmationTokenOptions.TokenLifespan.TotalHours
                },
                ct);

            _logger.LogInformation("Email confirmation link queued for user {UserId}", user.Id);
        }
        catch (EmailRateLimitExceededException)
        {
            _logger.LogWarning(
                "Email confirmation for user {UserId} was suppressed by the per-address rate limit",
                user.Id);
        }
    }

    /// <summary>
    /// Thông điệp dùng chung cho mọi lý do khiến token đặt lại mật khẩu không
    /// dùng được, để người gọi không dò được token nào từng hợp lệ.
    /// </summary>
    private static ApiResponse<bool> InvalidResetTokenResponse() =>
        ApiResponse<bool>.ErrorResponse(
            "This password reset link is not valid. It may have expired or already been used. "
            + "Request a new one.");

    /// <summary>
    /// Thông điệp dùng chung cho mọi lý do khiến link xác nhận email không dùng
    /// được — địa chỉ lạ, token sai, token hết hạn.
    /// </summary>
    private static ApiResponse<bool> InvalidConfirmationTokenResponse() =>
        ApiResponse<bool>.ErrorResponse(
            "This confirmation link is not valid. It may have expired. Request a new one.");

    /// <summary>
    /// Dựng link trỏ về một trang của frontend, mang theo email và token.
    /// </summary>
    private string BuildFrontendLink(string path, string email, string token)
    {
        // Token của Identity là base64 nên chứa '+', '/' và '='; email chứa '@'.
        // Không escape thì '+' lên URL thành dấu cách và token về tới server đã
        // sai một ký tự.
        return $"{ResolveFrontendBaseUrl()}{path}"
            + $"?email={Uri.EscapeDataString(email)}"
            + $"&token={Uri.EscapeDataString(token)}";
    }

    /// <summary>
    /// Địa chỉ gốc của frontend, lấy từ cùng biến môi trường mà CORS dùng.
    /// </summary>
    private string ResolveFrontendBaseUrl()
    {
        // FRONTEND_URL cho phép nhiều origin ngăn cách bằng dấu phẩy. Link trong
        // email chỉ có một đích nên lấy origin đầu tiên.
        var firstOrigin = (Environment.GetEnvironmentVariable("FRONTEND_URL")
                ?? _configuration["FrontendUrl"])
            ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault();

        return string.IsNullOrWhiteSpace(firstOrigin)
            ? DefaultFrontendBaseUrl
            : firstOrigin.TrimEnd('/');
    }

    /// <summary>
    /// Generates a JWT token for the authenticated user
    /// </summary>
    private async Task<string> GenerateJwtTokenAsync(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? jwtSettings["SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("FirstName", user.FirstName),
            new("LastName", user.LastName),

            // Cho phép huỷ hiệu lực token trước hạn: đổi mật khẩu làm Identity
            // sinh stamp mới, và JwtSecurityStampValidator từ chối mọi token còn
            // mang stamp cũ.
            new(AuthClaimTypes.SecurityStamp, user.SecurityStamp ?? string.Empty)
        };

        // Add role claims
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(GetTokenExpirationHours()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Maps a User entity to UserDto including roles
    /// </summary>
    private async Task<UserDto> MapUserToDtoAsync(User user)
    {
        var userDto = _mapper.Map<UserDto>(user);
        userDto.Roles = await _userManager.GetRolesAsync(user);
        return userDto;
    }

    /// <summary>
    /// Gets the token expiration time in hours from configuration
    /// </summary>
    private int GetTokenExpirationHours()
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        return int.TryParse(jwtSettings["ExpirationHours"], out var hours) ? hours : 24;
    }
}
