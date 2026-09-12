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
    /// Registers a new user from a valid invitation code.
    /// </summary>
    /// <remarks>
    /// Không trả về JWT. Tài khoản mới chưa xác nhận email nên chưa đăng nhập
    /// được, mà cấp token ngay ở đây thì bước xác nhận email thành hình thức.
    ///
    /// Role lấy từ mã mời, không lấy từ request — <see cref="SelfRegisterDto"/>
    /// không có chỗ nào để người gọi đặt role.
    /// </remarks>
    /// <param name="request">Registration details plus the invitation code</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Địa chỉ đã gửi email xác nhận, hoặc lỗi nói rõ vướng ở đâu</returns>
    Task<ApiResponse<SelfRegisterResultDto>> RegisterAsync(
        SelfRegisterDto request, CancellationToken ct = default);

    /// <summary>
    /// Confirms an email address using the token from the emailed link.
    /// </summary>
    /// <param name="request">Email and confirmation token</param>
    /// <returns>Success, or a single message covering every unusable-token case</returns>
    Task<ApiResponse<bool>> ConfirmEmailAsync(ConfirmEmailDto request);

    /// <summary>
    /// Emails another confirmation link, if the address belongs to an account
    /// still waiting for confirmation.
    /// </summary>
    /// <remarks>
    /// Hoàn tất bình thường dù địa chỉ có tài khoản hay không, giống
    /// <see cref="SendPasswordResetLinkAsync"/> và vì đúng lý do đó.
    /// </remarks>
    /// <param name="request">The address to send the link to</param>
    /// <param name="ct">Cancellation token</param>
    Task ResendEmailConfirmationAsync(ResendConfirmationDto request, CancellationToken ct = default);

    /// <summary>
    /// Tells whether an email address is still free.
    /// </summary>
    /// <remarks>
    /// Đây là kênh user enumeration có chủ ý, để form đăng ký báo trùng email
    /// ngay tại chỗ. Endpoint gọi nó phải có rate limit theo IP.
    /// </remarks>
    /// <param name="email">Address to check</param>
    /// <param name="ct">Cancellation token</param>
    Task<bool> IsEmailAvailableAsync(string email, CancellationToken ct = default);

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
