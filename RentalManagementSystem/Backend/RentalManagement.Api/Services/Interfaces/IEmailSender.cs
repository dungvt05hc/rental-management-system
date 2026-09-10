using RentalManagement.Api.Models.Email;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Tầng vận chuyển: thật sự đẩy một email ra máy chủ SMTP. Tách khỏi
/// <see cref="IEmailService"/> để phần xếp hàng và phần gửi không dính nhau —
/// chỉ tiến trình nền gọi tới đây.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Gửi email và chỉ trả về khi máy chủ SMTP đã nhận.
    /// </summary>
    Task DeliverAsync(EmailMessage message, CancellationToken ct);
}
