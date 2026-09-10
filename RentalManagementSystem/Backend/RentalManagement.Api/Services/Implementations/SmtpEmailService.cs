using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Đường gửi email thật: render nội dung ngay trong request rồi đẩy vào hàng đợi
/// và trả về. Việc mở kết nối SMTP do <see cref="EmailQueueProcessor"/> làm ở
/// tiến trình nền, nên một máy chủ SMTP chậm không kéo dài HTTP response.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IEmailQueue _queue;
    private readonly IEmailTemplateRenderer _renderer;
    private readonly IEmailLanguageResolver _languageResolver;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(
        IEmailQueue queue,
        IEmailTemplateRenderer renderer,
        IEmailLanguageResolver languageResolver,
        ILogger<SmtpEmailService> logger)
    {
        _queue = queue;
        _renderer = renderer;
        _languageResolver = languageResolver;
        _logger = logger;
    }

    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        Enqueue(new EmailMessage(to, subject, htmlBody, DateTime.UtcNow));
        return Task.CompletedTask;
    }

    public async Task SendTemplateAsync(
        string to,
        EmailTemplate template,
        object model,
        CancellationToken ct = default)
    {
        var language = await _languageResolver.ResolveAsync(to, ct);
        var rendered = _renderer.Render(template, language, model);

        _logger.LogInformation(
            "Queueing {Template} email in {Language}", template, language);

        Enqueue(new EmailMessage(to, rendered.Subject, rendered.HtmlBody, DateTime.UtcNow));
    }

    private void Enqueue(EmailMessage message)
    {
        if (_queue.TryEnqueue(message))
        {
            return;
        }

        // Hàng đợi đầy nghĩa là tiến trình nền không theo kịp — gần như luôn là
        // SMTP đang hỏng. Ghi log lỗi thay vì ném ra, vì người dùng không làm
        // gì được với thông tin này và luồng nghiệp vụ đã hoàn tất.
        _logger.LogError(
            "Email queue is full, dropping message with subject {Subject}", message.Subject);
    }
}
