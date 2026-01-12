using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for comprehensive user management operations in the System Management module
/// </summary>
public interface IUserManagementService
{
    /// <summary>
    /// Gets paginated and filtered list of users
    /// </summary>
    /// <param name="filter">Filter criteria for users</param>
    /// <returns>Paginated list of users</returns>
    Task<ApiResponse<PaginatedUsersDto>> GetUsersAsync(UserFilterDto filter);

    /// <summary>
    /// Gets a specific user by ID with detailed information
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>User details</returns>
    Task<ApiResponse<UserDto>> GetUserByIdAsync(string userId);

    /// <summary>
    /// Creates a new user in the system
    /// </summary>
    /// <param name="createDto">User creation details</param>
    /// <param name="createdBy">ID of the user creating this user</param>
    /// <returns>Created user details</returns>
    Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserDto createDto, string createdBy);

    /// <summary>
    /// Updates user profile information
    /// </summary>
    /// <param name="userId">User ID to update</param>
    /// <param name="updateDto">Updated user information</param>
    /// <param name="updatedBy">ID of the user performing the update</param>
    /// <returns>Updated user details</returns>
    Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, UpdateUserProfileDto updateDto, string updatedBy);

    /// <summary>
    /// Deletes a user from the system
    /// </summary>
    /// <param name="userId">User ID to delete</param>
    /// <param name="deletedBy">ID of the user performing the deletion</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteUserAsync(string userId, string deletedBy);

    /// <summary>
    /// Activates or deactivates a user account
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="activationDto">Activation details</param>
    /// <param name="modifiedBy">ID of the user performing the operation</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> SetUserActivationAsync(string userId, UserActivationDto activationDto, string modifiedBy);

    /// <summary>
    /// Resets a user's password (Admin only)
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="resetDto">Password reset details</param>
    /// <param name="resetBy">ID of the user performing the reset</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> ResetUserPasswordAsync(string userId, ResetUserPasswordDto resetDto, string resetBy);

    /// <summary>
    /// Assigns multiple roles to a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="roles">List of role names to assign</param>
    /// <param name="assignedBy">ID of the user assigning roles</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> AssignRolesAsync(string userId, List<string> roles, string assignedBy);

    /// <summary>
    /// Removes multiple roles from a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="roles">List of role names to remove</param>
    /// <param name="removedBy">ID of the user removing roles</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> RemoveRolesAsync(string userId, List<string> roles, string removedBy);

    /// <summary>
    /// Gets all available roles in the system
    /// </summary>
    /// <returns>List of roles with user counts</returns>
    Task<ApiResponse<IEnumerable<RoleDto>>> GetAvailableRolesAsync();

    /// <summary>
    /// Gets user statistics for dashboard
    /// </summary>
    /// <returns>User statistics</returns>
    Task<ApiResponse<UserStatisticsDto>> GetUserStatisticsAsync();

    /// <summary>
    /// Performs bulk operations on multiple users
    /// </summary>
    /// <param name="bulkOperation">Bulk operation details</param>
    /// <param name="performedBy">ID of the user performing the operation</param>
    /// <returns>Number of affected users</returns>
    Task<ApiResponse<int>> BulkUserOperationAsync(BulkUserOperationDto bulkOperation, string performedBy);

    /// <summary>
    /// Gets user activity audit log
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="limit">Maximum number of entries to return</param>
    /// <returns>List of audit log entries</returns>
    Task<ApiResponse<IEnumerable<string>>> GetUserAuditLogAsync(string userId, int limit = 50);
}
