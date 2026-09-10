namespace RentalManagement.Api.Models.Email;

/// <summary>
/// Các mẫu email hệ thống. Mỗi giá trị tương ứng với một cặp file
/// <c>Resources/EmailTemplates/{template}.vi.html</c> và <c>.en.html</c>
/// được nhúng vào assembly.
/// </summary>
public enum EmailTemplate
{
    /// <summary>
    /// Gửi link đặt lại mật khẩu.
    /// </summary>
    ResetPassword,

    /// <summary>
    /// Chào mừng tài khoản vừa được tạo.
    /// </summary>
    WelcomeNewUser,

    /// <summary>
    /// Yêu cầu xác nhận địa chỉ email.
    /// </summary>
    EmailConfirmation
}
