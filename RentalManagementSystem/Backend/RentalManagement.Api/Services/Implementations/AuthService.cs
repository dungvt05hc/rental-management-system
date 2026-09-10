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
    private readonly DataProtectionTokenProviderOptions _tokenProviderOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper,
        IConfiguration configuration,
        IEmailService emailService,
        IOptions<DataProtectionTokenProviderOptions> tokenProviderOptions,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _mapper = mapper;
        _configuration = configuration;
        _emailService = emailService;
        _tokenProviderOptions = tokenProviderOptions.Value;
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
    /// Registers a new user in the system
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto registerRequest)
    {
        var existingUser = await _userManager.FindByEmailAsync(registerRequest.Email);
        if (existingUser is not null)
        {
            return ApiResponse<AuthResponseDto>.ErrorResponse("User with this email already exists");
        }

        var user = _mapper.Map<User>(registerRequest);
        var result = await _userManager.CreateAsync(user, registerRequest.Password);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            _logger.LogWarning("User registration failed for {Email}: {Errors}", 
                registerRequest.Email, string.Join(", ", errors));
            return ApiResponse<AuthResponseDto>.ErrorResponse("Registration failed", errors);
        }

        // Assign role
        var roleResult = await _userManager.AddToRoleAsync(user, registerRequest.Role);
        if (!roleResult.Succeeded)
        {
            _logger.LogWarning("Failed to assign role {Role} to user {Email}", 
                registerRequest.Role, registerRequest.Email);
        }

        var token = await GenerateJwtTokenAsync(user);
        var userDto = await MapUserToDtoAsync(user);

        _logger.LogInformation("User registered successfully: {Email}", registerRequest.Email);

        return ApiResponse<AuthResponseDto>.SuccessResponse(new AuthResponseDto
        {
            Token = token,
            User = userDto,
            ExpiresAt = DateTime.UtcNow.AddHours(GetTokenExpirationHours())
        }, "Registration successful");
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
                    ResetLink = BuildPasswordResetLink(user.Email, token),
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
    /// Thông điệp dùng chung cho mọi lý do khiến token đặt lại mật khẩu không
    /// dùng được, để người gọi không dò được token nào từng hợp lệ.
    /// </summary>
    private static ApiResponse<bool> InvalidResetTokenResponse() =>
        ApiResponse<bool>.ErrorResponse(
            "This password reset link is not valid. It may have expired or already been used. "
            + "Request a new one.");

    /// <summary>
    /// Dựng link đặt lại mật khẩu trỏ về frontend.
    /// </summary>
    private string BuildPasswordResetLink(string email, string token)
    {
        // Token của Identity là base64 nên chứa '+', '/' và '='; email chứa '@'.
        // Không escape thì '+' lên URL thành dấu cách và token về tới server đã
        // sai một ký tự.
        return $"{ResolveFrontendBaseUrl()}/reset-password"
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
