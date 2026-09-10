namespace RentalManagement.Api.Models.Email;

/// <summary>
/// Một email đã render xong, sẵn sàng để gửi. Đây là đơn vị nằm trong hàng đợi
/// giữa request đang xử lý và tiến trình nền gửi SMTP.
/// </summary>
/// <param name="To">Địa chỉ người nhận.</param>
/// <param name="Subject">Tiêu đề, đã theo đúng ngôn ngữ người nhận.</param>
/// <param name="HtmlBody">Nội dung HTML đầy đủ.</param>
/// <param name="QueuedAt">Thời điểm được đưa vào hàng đợi (UTC), dùng để log độ trễ.</param>
public sealed record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    DateTime QueuedAt);
