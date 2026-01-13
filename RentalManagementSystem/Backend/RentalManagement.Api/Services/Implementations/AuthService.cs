using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
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
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _mapper = mapper;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a user with email and password
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto loginRequest)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", loginRequest.Email);
            return ApiResponse<AuthResponseDto>.ErrorResponse("An error occurred during login");
        }
    }

    /// <summary>
    /// Registers a new user in the system
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto registerRequest)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for email: {Email}", registerRequest.Email);
            return ApiResponse<AuthResponseDto>.ErrorResponse("An error occurred during registration");
        }
    }

    /// <summary>
    /// Gets user information by user ID
    /// </summary>
    public async Task<ApiResponse<UserDto>> GetUserAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found");
            }

            var userDto = await MapUserToDtoAsync(user);
            return ApiResponse<UserDto>.SuccessResponse(userDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user: {UserId}", userId);
            return ApiResponse<UserDto>.ErrorResponse("An error occurred while retrieving user");
        }
    }

    /// <summary>
    /// Gets all users in the system
    /// </summary>
    public async Task<ApiResponse<IEnumerable<UserDto>>> GetUsersAsync()
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return ApiResponse<IEnumerable<UserDto>>.ErrorResponse("An error occurred while retrieving users");
        }
    }

    /// <summary>
    /// Updates user information
    /// </summary>
    public async Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, RegisterRequestDto updateRequest)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user: {UserId}", userId);
            return ApiResponse<UserDto>.ErrorResponse("An error occurred while updating user");
        }
    }

    /// <summary>
    /// Deletes a user from the system
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteUserAsync(string userId)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user: {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting user");
        }
    }

    /// <summary>
    /// Assigns a role to a user
    /// </summary>
    public async Task<ApiResponse<bool>> AssignRoleAsync(string userId, string role)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning role {Role} to user: {UserId}", role, userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while assigning role");
        }
    }

    /// <summary>
    /// Removes a role from a user
    /// </summary>
    public async Task<ApiResponse<bool>> RemoveRoleAsync(string userId, string role)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role {Role} from user: {UserId}", role, userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while removing role");
        }
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
            new("LastName", user.LastName)
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
