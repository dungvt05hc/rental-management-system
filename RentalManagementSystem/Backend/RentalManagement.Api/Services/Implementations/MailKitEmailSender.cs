using System.Text;

using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Gửi email qua SMTP bằng MailKit.
/// </summary>
/// <remarks>
/// Dùng MailKit thay cho <c>System.Net.Mail.SmtpClient</c> vì lớp đó đã được
/// Microsoft đánh dấu không nên dùng cho code mới (SYSLIB0014) và không hỗ trợ
/// đầy đủ STARTTLS/OAuth như các nhà cung cấp hiện nay yêu cầu.
/// </remarks>
public class MailKitEmailSender : IEmailSender
{
    private readonly EmailSettings _settings;
    private readonly ILogger<MailKitEmailSender> _logger;

    public MailKitEmailSender(IOptions<EmailSettings> settings, ILogger<MailKitEmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task DeliverAsync(EmailMessage message, CancellationToken ct)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_settings.FromName, _settings.FromEmail));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new TextPart(TextFormat.Html) { Text = message.HtmlBody };

        // MailKit tự chọn charset hẹp nhất chứa được nội dung; ép UTF-8 để
        // tiếng Việt có dấu luôn đi ra cùng một bảng mã, cả ở tiêu đề lẫn thân.
        mime.Headers.Replace(HeaderId.Subject, Encoding.UTF8, message.Subject);

        using var client = new SmtpClient();

        // Auto: cổng 465 dùng SSL ngay khi kết nối, 587 dùng STARTTLS. Chọn theo
        // cổng nên không cần thêm biến môi trường cho việc này.
        await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.Auto, ct);

        if (!string.IsNullOrWhiteSpace(_settings.User))
        {
            await client.AuthenticateAsync(_settings.User, _settings.Password, ct);
        }

        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(quit: true, ct);

        _logger.LogInformation(
            "Sent email with subject {Subject}, queued for {DelayMs}ms",
            message.Subject,
            (int)(DateTime.UtcNow - message.QueuedAt).TotalMilliseconds);
    }
}
