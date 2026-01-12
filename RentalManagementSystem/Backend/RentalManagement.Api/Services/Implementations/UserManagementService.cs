using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of comprehensive user management operations for the System Management module
/// </summary>
public class UserManagementService : IUserManagementService
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(
        UserManager<User> userManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper,
        ILogger<UserManagementService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Gets paginated and filtered list of users
    /// </summary>
    public async Task<ApiResponse<PaginatedUsersDto>> GetUsersAsync(UserFilterDto filter)
    {
        try
        {
            var query = _userManager.Users.AsQueryable();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTerm = filter.SearchTerm.ToLower();
                query = query.Where(u =>
                    u.FirstName.ToLower().Contains(searchTerm) ||
                    u.LastName.ToLower().Contains(searchTerm) ||
                    u.Email!.ToLower().Contains(searchTerm));
            }

            // Apply active status filter
            if (filter.IsActive.HasValue)
            {
                query = query.Where(u => u.IsActive == filter.IsActive.Value);
            }

            // Apply role filter
            if (!string.IsNullOrWhiteSpace(filter.Role))
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(filter.Role);
                var userIdsInRole = usersInRole.Select(u => u.Id).ToList();
                query = query.Where(u => userIdsInRole.Contains(u.Id));
            }

            // Apply sorting
            query = filter.SortBy.ToLower() switch
            {
                "firstname" => filter.SortOrder.ToLower() == "asc"
                    ? query.OrderBy(u => u.FirstName)
                    : query.OrderByDescending(u => u.FirstName),
                "lastname" => filter.SortOrder.ToLower() == "asc"
                    ? query.OrderBy(u => u.LastName)
                    : query.OrderByDescending(u => u.LastName),
                "email" => filter.SortOrder.ToLower() == "asc"
                    ? query.OrderBy(u => u.Email)
                    : query.OrderByDescending(u => u.Email),
                "createdat" => filter.SortOrder.ToLower() == "asc"
                    ? query.OrderBy(u => u.CreatedAt)
                    : query.OrderByDescending(u => u.CreatedAt),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var users = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            // Map to DTOs with roles
            var userDtos = new List<UserDto>();
            foreach (var user in users)
            {
                var userDto = await MapUserToDtoAsync(user);
                userDtos.Add(userDto);
            }

            var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

            var result = new PaginatedUsersDto
            {
                Users = userDtos,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                HasPrevious = filter.Page > 1,
                HasNext = filter.Page < totalPages
            };

            return ApiResponse<PaginatedUsersDto>.SuccessResponse(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users with filter");
            return ApiResponse<PaginatedUsersDto>.ErrorResponse("An error occurred while retrieving users");
        }
    }

    /// <summary>
    /// Gets a specific user by ID with detailed information
    /// </summary>
    public async Task<ApiResponse<UserDto>> GetUserByIdAsync(string userId)
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
            _logger.LogError(ex, "Error retrieving user {UserId}", userId);
            return ApiResponse<UserDto>.ErrorResponse("An error occurred while retrieving user");
        }
    }

    /// <summary>
    /// Creates a new user in the system
    /// </summary>
    public async Task<ApiResponse<UserDto>> CreateUserAsync(CreateUserDto createDto, string createdBy)
    {
        try
        {
            // Check if user with email already exists
            var existingUser = await _userManager.FindByEmailAsync(createDto.Email);
            if (existingUser is not null)
            {
                return ApiResponse<UserDto>.ErrorResponse("A user with this email already exists");
            }

            // Validate roles
            foreach (var role in createDto.Roles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                {
                    return ApiResponse<UserDto>.ErrorResponse($"Role '{role}' does not exist");
                }
            }

            // Create new user
            var user = new User
            {
                UserName = createDto.Email,
                Email = createDto.Email,
                FirstName = createDto.FirstName,
                LastName = createDto.LastName,
                PhoneNumber = createDto.PhoneNumber,
                IsActive = createDto.IsActive,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Generate password if not provided
            var password = createDto.Password ?? GenerateRandomPassword();

            var result = await _userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                _logger.LogWarning("Failed to create user {Email}: {Errors}",
                    createDto.Email, string.Join(", ", errors));
                return ApiResponse<UserDto>.ErrorResponse("User creation failed", errors);
            }

            // Assign roles
            foreach (var role in createDto.Roles)
            {
                await _userManager.AddToRoleAsync(user, role);
            }

            var userDto = await MapUserToDtoAsync(user);
            _logger.LogInformation("User {Email} created by {CreatedBy}", createDto.Email, createdBy);

            return ApiResponse<UserDto>.SuccessResponse(userDto, "User created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return ApiResponse<UserDto>.ErrorResponse("An error occurred while creating user");
        }
    }

    /// <summary>
    /// Updates user profile information
    /// </summary>
    public async Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, UpdateUserProfileDto updateDto, string updatedBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<UserDto>.ErrorResponse("User not found");
            }

            // Update fields if provided
            if (!string.IsNullOrWhiteSpace(updateDto.FirstName))
            {
                user.FirstName = updateDto.FirstName;
            }

            if (!string.IsNullOrWhiteSpace(updateDto.LastName))
            {
                user.LastName = updateDto.LastName;
            }

            if (!string.IsNullOrWhiteSpace(updateDto.Email) && updateDto.Email != user.Email)
            {
                // Check if new email is already in use
                var existingUser = await _userManager.FindByEmailAsync(updateDto.Email);
                if (existingUser is not null && existingUser.Id != userId)
                {
                    return ApiResponse<UserDto>.ErrorResponse("Email is already in use by another user");
                }

                user.Email = updateDto.Email;
                user.UserName = updateDto.Email;
            }

            if (updateDto.PhoneNumber is not null)
            {
                user.PhoneNumber = updateDto.PhoneNumber;
            }

            if (updateDto.IsActive.HasValue)
            {
                user.IsActive = updateDto.IsActive.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return ApiResponse<UserDto>.ErrorResponse("User update failed", errors);
            }

            var userDto = await MapUserToDtoAsync(user);
            _logger.LogInformation("User {UserId} updated by {UpdatedBy}", userId, updatedBy);

            return ApiResponse<UserDto>.SuccessResponse(userDto, "User updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId}", userId);
            return ApiResponse<UserDto>.ErrorResponse("An error occurred while updating user");
        }
    }

    /// <summary>
    /// Deletes a user from the system
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteUserAsync(string userId, string deletedBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found");
            }

            // Prevent deleting own account
            if (userId == deletedBy)
            {
                return ApiResponse<bool>.ErrorResponse("You cannot delete your own account");
            }

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return ApiResponse<bool>.ErrorResponse("User deletion failed", errors);
            }

            _logger.LogInformation("User {UserId} deleted by {DeletedBy}", userId, deletedBy);
            return ApiResponse<bool>.SuccessResponse(true, "User deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting user");
        }
    }

    /// <summary>
    /// Activates or deactivates a user account
    /// </summary>
    public async Task<ApiResponse<bool>> SetUserActivationAsync(string userId, UserActivationDto activationDto, string modifiedBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found");
            }

            // Prevent deactivating own account
            if (userId == modifiedBy && !activationDto.IsActive)
            {
                return ApiResponse<bool>.ErrorResponse("You cannot deactivate your own account");
            }

            user.IsActive = activationDto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return ApiResponse<bool>.ErrorResponse("User activation update failed", errors);
            }

            var action = activationDto.IsActive ? "activated" : "deactivated";
            _logger.LogInformation("User {UserId} {Action} by {ModifiedBy}. Reason: {Reason}",
                userId, action, modifiedBy, activationDto.Reason ?? "None");

            return ApiResponse<bool>.SuccessResponse(true, $"User {action} successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting user activation for {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while updating user activation status");
        }
    }

    /// <summary>
    /// Resets a user's password (Admin only)
    /// </summary>
    public async Task<ApiResponse<bool>> ResetUserPasswordAsync(string userId, ResetUserPasswordDto resetDto, string resetBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found");
            }

            // Remove old password and set new one
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, resetDto.NewPassword);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                return ApiResponse<bool>.ErrorResponse("Password reset failed", errors);
            }

            _logger.LogInformation("Password reset for user {UserId} by {ResetBy}", userId, resetBy);

            // TODO: Send email notification if requested
            if (resetDto.SendEmailNotification)
            {
                _logger.LogInformation("Email notification requested for password reset (not implemented yet)");
            }

            return ApiResponse<bool>.SuccessResponse(true, "Password reset successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for user {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while resetting password");
        }
    }

    /// <summary>
    /// Assigns multiple roles to a user
    /// </summary>
    public async Task<ApiResponse<bool>> AssignRolesAsync(string userId, List<string> roles, string assignedBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found");
            }

            // Validate all roles exist
            foreach (var role in roles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                {
                    return ApiResponse<bool>.ErrorResponse($"Role '{role}' does not exist");
                }
            }

            // Get current roles
            var currentRoles = await _userManager.GetRolesAsync(user);

            // Add new roles that user doesn't already have
            var rolesToAdd = roles.Except(currentRoles).ToList();
            if (rolesToAdd.Any())
            {
                var result = await _userManager.AddToRolesAsync(user, rolesToAdd);
                if (!result.Succeeded)
                {
                    var errors = result.Errors.Select(e => e.Description);
                    return ApiResponse<bool>.ErrorResponse("Role assignment failed", errors);
                }
            }

            _logger.LogInformation("Roles {Roles} assigned to user {UserId} by {AssignedBy}",
                string.Join(", ", rolesToAdd), userId, assignedBy);

            return ApiResponse<bool>.SuccessResponse(true, "Roles assigned successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning roles to user {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while assigning roles");
        }
    }

    /// <summary>
    /// Removes multiple roles from a user
    /// </summary>
    public async Task<ApiResponse<bool>> RemoveRolesAsync(string userId, List<string> roles, string removedBy)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<bool>.ErrorResponse("User not found");
            }

            // Get current roles
            var currentRoles = await _userManager.GetRolesAsync(user);

            // Remove only roles that user currently has
            var rolesToRemove = roles.Intersect(currentRoles).ToList();
            if (rolesToRemove.Any())
            {
                // Ensure user has at least one role remaining
                if (currentRoles.Count - rolesToRemove.Count < 1)
                {
                    return ApiResponse<bool>.ErrorResponse("User must have at least one role");
                }

                var result = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
                if (!result.Succeeded)
                {
                    var errors = result.Errors.Select(e => e.Description);
                    return ApiResponse<bool>.ErrorResponse("Role removal failed", errors);
                }
            }

            _logger.LogInformation("Roles {Roles} removed from user {UserId} by {RemovedBy}",
                string.Join(", ", rolesToRemove), userId, removedBy);

            return ApiResponse<bool>.SuccessResponse(true, "Roles removed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing roles from user {UserId}", userId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while removing roles");
        }
    }

    /// <summary>
    /// Gets all available roles in the system
    /// </summary>
    public async Task<ApiResponse<IEnumerable<RoleDto>>> GetAvailableRolesAsync()
    {
        try
        {
            var roles = await _roleManager.Roles.ToListAsync();
            var roleDtos = new List<RoleDto>();

            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
                roleDtos.Add(new RoleDto
                {
                    Id = role.Id,
                    Name = role.Name!,
                    UserCount = usersInRole.Count
                });
            }

            return ApiResponse<IEnumerable<RoleDto>>.SuccessResponse(roleDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available roles");
            return ApiResponse<IEnumerable<RoleDto>>.ErrorResponse("An error occurred while retrieving roles");
        }
    }

    /// <summary>
    /// Gets user statistics for dashboard
    /// </summary>
    public async Task<ApiResponse<UserStatisticsDto>> GetUserStatisticsAsync()
    {
        try
        {
            var allUsers = await _userManager.Users.ToListAsync();
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var statistics = new UserStatisticsDto
            {
                TotalUsers = allUsers.Count,
                ActiveUsers = allUsers.Count(u => u.IsActive),
                InactiveUsers = allUsers.Count(u => !u.IsActive),
                NewUsersLast30Days = allUsers.Count(u => u.CreatedAt >= thirtyDaysAgo)
            };

            // Get users by role
            var roles = await _roleManager.Roles.ToListAsync();
            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
                statistics.UsersByRole[role.Name!] = usersInRole.Count;
            }

            return ApiResponse<UserStatisticsDto>.SuccessResponse(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user statistics");
            return ApiResponse<UserStatisticsDto>.ErrorResponse("An error occurred while retrieving user statistics");
        }
    }

    /// <summary>
    /// Performs bulk operations on multiple users
    /// </summary>
    public async Task<ApiResponse<int>> BulkUserOperationAsync(BulkUserOperationDto bulkOperation, string performedBy)
    {
        try
        {
            var affectedCount = 0;

            foreach (var userId in bulkOperation.UserIds)
            {
                // Skip if trying to perform operation on self
                if (userId == performedBy)
                {
                    _logger.LogWarning("Skipping bulk operation on self: {UserId}", userId);
                    continue;
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user is null)
                {
                    _logger.LogWarning("User not found during bulk operation: {UserId}", userId);
                    continue;
                }

                var success = bulkOperation.Operation.ToLower() switch
                {
                    "activate" => await PerformActivationAsync(user, true),
                    "deactivate" => await PerformActivationAsync(user, false),
                    "delete" => await PerformDeletionAsync(user),
                    _ => false
                };

                if (success)
                {
                    affectedCount++;
                }
            }

            _logger.LogInformation("Bulk operation '{Operation}' performed on {Count} users by {PerformedBy}",
                bulkOperation.Operation, affectedCount, performedBy);

            return ApiResponse<int>.SuccessResponse(affectedCount,
                $"Bulk operation completed. {affectedCount} users affected.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk user operation");
            return ApiResponse<int>.ErrorResponse("An error occurred during bulk operation");
        }
    }

    /// <summary>
    /// Gets user activity audit log
    /// </summary>
    public async Task<ApiResponse<IEnumerable<string>>> GetUserAuditLogAsync(string userId, int limit = 50)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return ApiResponse<IEnumerable<string>>.ErrorResponse("User not found");
            }

            // Placeholder for audit log - in a real system, this would query an audit table
            var auditEntries = new List<string>
            {
                $"User created: {user.CreatedAt:yyyy-MM-dd HH:mm:ss}",
                $"Last updated: {user.UpdatedAt:yyyy-MM-dd HH:mm:ss}",
                $"Account status: {(user.IsActive ? "Active" : "Inactive")}"
            };

            _logger.LogInformation("Audit log retrieved for user {UserId}", userId);

            return ApiResponse<IEnumerable<string>>.SuccessResponse(auditEntries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit log for user {UserId}", userId);
            return ApiResponse<IEnumerable<string>>.ErrorResponse("An error occurred while retrieving audit log");
        }
    }

    #region Private Helper Methods

    /// <summary>
    /// Maps a User entity to UserDto including roles
    /// </summary>
    private async Task<UserDto> MapUserToDtoAsync(User user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            Email = user.Email!,
            PhoneNumber = user.PhoneNumber,
            Roles = roles,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }

    /// <summary>
    /// Generates a random secure password
    /// </summary>
    private static string GenerateRandomPassword()
    {
        var options = new PasswordOptions
        {
            RequiredLength = 12,
            RequireDigit = true,
            RequireLowercase = true,
            RequireUppercase = true,
            RequireNonAlphanumeric = true
        };

        var randomChars = new[]
        {
            "ABCDEFGHJKLMNOPQRSTUVWXYZ",
            "abcdefghijkmnopqrstuvwxyz",
            "0123456789",
            "!@#$%^&*"
        };

        var random = new Random();
        var chars = new List<char>();

        // Ensure at least one character from each required group
        if (options.RequireUppercase)
            chars.Insert(random.Next(0, chars.Count), randomChars[0][random.Next(0, randomChars[0].Length)]);

        if (options.RequireLowercase)
            chars.Insert(random.Next(0, chars.Count), randomChars[1][random.Next(0, randomChars[1].Length)]);

        if (options.RequireDigit)
            chars.Insert(random.Next(0, chars.Count), randomChars[2][random.Next(0, randomChars[2].Length)]);

        if (options.RequireNonAlphanumeric)
            chars.Insert(random.Next(0, chars.Count), randomChars[3][random.Next(0, randomChars[3].Length)]);

        // Fill the rest
        for (var i = chars.Count; i < options.RequiredLength; i++)
        {
            var rcs = randomChars[random.Next(0, randomChars.Length)];
            chars.Insert(random.Next(0, chars.Count), rcs[random.Next(0, rcs.Length)]);
        }

        return new string(chars.ToArray());
    }

    /// <summary>
    /// Performs activation/deactivation on a user
    /// </summary>
    private async Task<bool> PerformActivationAsync(User user, bool isActive)
    {
        try
        {
            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;
            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Performs deletion on a user
    /// </summary>
    private async Task<bool> PerformDeletionAsync(User user)
    {
        try
        {
            var result = await _userManager.DeleteAsync(user);
            return result.Succeeded;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
