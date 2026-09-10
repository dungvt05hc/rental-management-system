using RentalManagement.Api.Models.Email;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Điểm vào duy nhất để gửi email. Cả hai phương thức đều trả về ngay sau khi
/// email được đưa vào hàng đợi trong process — việc kết nối SMTP diễn ra ở
/// tiến trình nền, nên HTTP response không bao giờ phải chờ máy chủ SMTP.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Gửi một email với nội dung HTML dựng sẵn.
    /// </summary>
    /// <param name="to">Địa chỉ người nhận.</param>
    /// <param name="subject">Tiêu đề.</param>
    /// <param name="htmlBody">Nội dung HTML.</param>
    /// <param name="ct">Token hủy.</param>
    /// <exception cref="EmailRateLimitExceededException">
    /// Địa chỉ này đã nhận quá số email cho phép trong cửa sổ rate limit.
    /// </exception>
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);

    /// <summary>
    /// Render một template theo ngôn ngữ của người nhận rồi gửi.
    /// Ngôn ngữ lấy từ <c>User.PreferredLanguage</c>, không có thì mặc định tiếng Việt.
    /// </summary>
    /// <param name="to">Địa chỉ người nhận.</param>
    /// <param name="template">Template cần dùng.</param>
    /// <param name="model">Đối tượng cung cấp giá trị cho các placeholder trong template.</param>
    /// <param name="ct">Token hủy.</param>
    /// <exception cref="EmailRateLimitExceededException">
    /// Địa chỉ này đã nhận quá số email cho phép trong cửa sổ rate limit.
    /// </exception>
    Task SendTemplateAsync(string to, EmailTemplate template, object model, CancellationToken ct = default);
}
