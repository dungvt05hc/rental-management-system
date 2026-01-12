using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for user authentication requests
/// </summary>
public class LoginRequestDto
{
    /// <summary>
    /// User's email address
    /// </summary>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// DTO for user registration requests
/// </summary>
public class RegisterRequestDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Password confirmation
    /// </summary>
    [Required]
    [Compare(nameof(Password))]
    public string ConfirmPassword { get; set; } = string.Empty;

    /// <summary>
    /// User's phone number
    /// </summary>
    [Phone]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Role to assign to the user
    /// </summary>
    public string Role { get; set; } = "Staff";
}

/// <summary>
/// DTO for authentication response
/// </summary>
public class AuthResponseDto
{
    /// <summary>
    /// JWT access token
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// User information
    /// </summary>
    public UserDto User { get; set; } = null!;

    /// <summary>
    /// Token expiration time
    /// </summary>
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// DTO for user information
/// </summary>
public class UserDto
{
    /// <summary>
    /// User's unique identifier
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// User's first name
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// User's full name
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's phone number
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// User's roles
    /// </summary>
    public IList<string> Roles { get; set; } = new List<string>();

    /// <summary>
    /// Whether the user is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// When the user was created
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for login requests - alias for LoginRequestDto
/// </summary>
public class LoginDto : LoginRequestDto
{
}

/// <summary>
/// DTO for registration requests - alias for RegisterRequestDto
/// </summary>
public class RegisterDto : RegisterRequestDto
{
}

/// <summary>
/// DTO for refresh token requests
/// </summary>
public class RefreshTokenDto
{
    /// <summary>
    /// The refresh token
    /// </summary>
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// DTO for password change requests
/// </summary>
public class ChangePasswordDto
{
    /// <summary>
    /// Current password
    /// </summary>
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>
    /// New password
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>
    /// Confirm new password
    /// </summary>
    [Required]
    [Compare("NewPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating user information
/// </summary>
public class UpdateUserDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [StringLength(100)]
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    [StringLength(100)]
    public string? LastName { get; set; }

    /// <summary>
    /// User's phone number
    /// </summary>
    [Phone]
    public string? PhoneNumber { get; set; }
}

/// <summary>
/// DTO for role assignment requests
/// </summary>
public class AssignRoleDto
{
    /// <summary>
    /// Role name to assign or remove
    /// </summary>
    [Required]
    public string RoleName { get; set; } = string.Empty;
}

/// <summary>
/// DTO for creating a new user (Admin/Manager only)
/// </summary>
public class CreateUserDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's phone number
    /// </summary>
    [Phone]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Initial password (if not provided, a default will be generated)
    /// </summary>
    [StringLength(100, MinimumLength = 6)]
    public string? Password { get; set; }

    /// <summary>
    /// Roles to assign to the user
    /// </summary>
    public List<string> Roles { get; set; } = new() { "Staff" };

    /// <summary>
    /// Whether the user account should be active immediately
    /// </summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// DTO for updating user details (Admin/Manager only)
/// </summary>
public class UpdateUserProfileDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [StringLength(100)]
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    [StringLength(100)]
    public string? LastName { get; set; }

    /// <summary>
    /// User's email address
    /// </summary>
    [EmailAddress]
    public string? Email { get; set; }

    /// <summary>
    /// User's phone number
    /// </summary>
    [Phone]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Whether the user is active
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO for paginated user list request
/// </summary>
public class UserFilterDto
{
    /// <summary>
    /// Page number (1-based)
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// Search term (searches in name, email)
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by role
    /// </summary>
    public string? Role { get; set; }

    /// <summary>
    /// Filter by active status
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Sort field (FirstName, LastName, Email, CreatedAt)
    /// </summary>
    public string SortBy { get; set; } = "CreatedAt";

    /// <summary>
    /// Sort order (asc or desc)
    /// </summary>
    public string SortOrder { get; set; } = "desc";
}

/// <summary>
/// DTO for paginated user list response
/// </summary>
public class PaginatedUsersDto
{
    /// <summary>
    /// List of users
    /// </summary>
    public IEnumerable<UserDto> Users { get; set; } = new List<UserDto>();

    /// <summary>
    /// Total number of users
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Whether there is a previous page
    /// </summary>
    public bool HasPrevious { get; set; }

    /// <summary>
    /// Whether there is a next page
    /// </summary>
    public bool HasNext { get; set; }
}

/// <summary>
/// DTO for resetting user password (Admin only)
/// </summary>
public class ResetUserPasswordDto
{
    /// <summary>
    /// New password for the user
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>
    /// Confirm new password
    /// </summary>
    [Required]
    [Compare(nameof(NewPassword))]
    public string ConfirmPassword { get; set; } = string.Empty;

    /// <summary>
    /// Whether to send email notification to user
    /// </summary>
    public bool SendEmailNotification { get; set; } = false;
}

/// <summary>
/// DTO for user activation/deactivation
/// </summary>
public class UserActivationDto
{
    /// <summary>
    /// Whether to activate or deactivate the user
    /// </summary>
    [Required]
    public bool IsActive { get; set; }

    /// <summary>
    /// Reason for activation/deactivation
    /// </summary>
    [StringLength(500)]
    public string? Reason { get; set; }
}

/// <summary>
/// DTO for bulk user operations
/// </summary>
public class BulkUserOperationDto
{
    /// <summary>
    /// List of user IDs to perform operation on
    /// </summary>
    [Required]
    public List<string> UserIds { get; set; } = new();

    /// <summary>
    /// Operation to perform (activate, deactivate, delete)
    /// </summary>
    [Required]
    public string Operation { get; set; } = string.Empty;

    /// <summary>
    /// Additional data for the operation
    /// </summary>
    public Dictionary<string, object>? Data { get; set; }
}

/// <summary>
/// DTO for user statistics
/// </summary>
public class UserStatisticsDto
{
    /// <summary>
    /// Total number of users
    /// </summary>
    public int TotalUsers { get; set; }

    /// <summary>
    /// Number of active users
    /// </summary>
    public int ActiveUsers { get; set; }

    /// <summary>
    /// Number of inactive users
    /// </summary>
    public int InactiveUsers { get; set; }

    /// <summary>
    /// Users by role
    /// </summary>
    public Dictionary<string, int> UsersByRole { get; set; } = new();

    /// <summary>
    /// New users in the last 30 days
    /// </summary>
    public int NewUsersLast30Days { get; set; }
}

/// <summary>
/// DTO for available roles
/// </summary>
public class RoleDto
{
    /// <summary>
    /// Role ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Role name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Number of users with this role
    /// </summary>
    public int UserCount { get; set; }
}
