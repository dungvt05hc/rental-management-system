using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for authentication and user management operations
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Authenticates a user with email and password
    /// </summary>
    /// <param name="loginRequest">Login credentials</param>
    /// <returns>Authentication response with token and user info</returns>
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto loginRequest);

    /// <summary>
    /// Registers a new user in the system
    /// </summary>
    /// <param name="registerRequest">User registration details</param>
    /// <returns>Authentication response with token and user info</returns>
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto registerRequest);

    /// <summary>
    /// Emails a password reset link to the address, if it belongs to an active account.
    /// </summary>
    /// <remarks>
    /// Completes normally whether or not the address is registered, and whether or
    /// not the email could be queued. The caller must not be able to tell those
    /// cases apart: any difference in response — status code, message, or timing —
    /// turns this endpoint into an oracle for which addresses have accounts.
    /// </remarks>
    /// <param name="request">The address to send the link to</param>
    /// <param name="ct">Cancellation token</param>
    Task SendPasswordResetLinkAsync(ForgotPasswordDto request, CancellationToken ct = default);

    /// <summary>
    /// Sets a new password using a token from a password reset link.
    /// </summary>
    /// <remarks>
    /// On success every previously issued JWT for the account stops working,
    /// because the security stamp changes and
    /// <see cref="Security.JwtSecurityStampValidator"/> rejects tokens carrying
    /// the old one.
    /// </remarks>
    /// <param name="request">Email, reset token and new password</param>
    /// <returns>Success, or an error naming what was wrong</returns>
    Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordDto request);

    /// <summary>
    /// Gets user information by user ID
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>User information</returns>
    Task<ApiResponse<UserDto>> GetUserAsync(string userId);

    /// <summary>
    /// Gets all users in the system
    /// </summary>
    /// <returns>List of all users</returns>
    Task<ApiResponse<IEnumerable<UserDto>>> GetUsersAsync();

    /// <summary>
    /// Updates user information
    /// </summary>
    /// <param name="userId">User ID to update</param>
    /// <param name="updateRequest">Updated user information</param>
    /// <returns>Updated user information</returns>
    Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, RegisterRequestDto updateRequest);

    /// <summary>
    /// Deletes a user from the system
    /// </summary>
    /// <param name="userId">User ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteUserAsync(string userId);

    /// <summary>
    /// Assigns a role to a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="role">Role to assign</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> AssignRoleAsync(string userId, string role);

    /// <summary>
    /// Removes a role from a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="role">Role to remove</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> RemoveRoleAsync(string userId, string role);
}
