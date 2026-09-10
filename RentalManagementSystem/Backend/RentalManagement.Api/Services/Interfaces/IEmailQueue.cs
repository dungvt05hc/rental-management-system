using RentalManagement.Api.Models.Email;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Hàng đợi email trong process, ngăn cách request đang xử lý với tiến trình
/// nền gửi SMTP.
/// </summary>
/// <remarks>
/// Hàng đợi nằm trong bộ nhớ: email chưa gửi sẽ mất nếu process dừng đột ngột.
/// Đánh đổi này chấp nhận được với quy mô hiện tại — email hệ thống đều là loại
/// người dùng có thể yêu cầu lại (đặt lại mật khẩu, xác nhận email).
/// </remarks>
public interface IEmailQueue
{
    /// <summary>
    /// Đưa email vào hàng đợi. Không bao giờ chặn.
    /// </summary>
    /// <returns><c>false</c> nếu hàng đợi đã đầy và email bị loại bỏ.</returns>
    bool TryEnqueue(EmailMessage message);

    /// <summary>
    /// Đọc email từ hàng đợi cho tới khi <paramref name="ct"/> bị hủy.
    /// </summary>
    IAsyncEnumerable<EmailMessage> DequeueAllAsync(CancellationToken ct);
}
