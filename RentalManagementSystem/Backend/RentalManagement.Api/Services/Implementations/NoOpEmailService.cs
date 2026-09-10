using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Dùng khi <c>SMTP_HOST</c> chưa được đặt: chỉ ghi log những gì lẽ ra đã gửi.
/// Nhờ vậy máy dev chạy được toàn bộ ứng dụng mà không cần máy chủ SMTP, và
/// không luồng nào phải bọc try/catch chỉ vì thiếu cấu hình email.
/// </summary>
/// <remarks>
/// Template vẫn được render đầy đủ, nên lỗi template hay lỗi placeholder lộ ra
/// ngay ở môi trường dev chứ không đợi tới production.
/// </remarks>
public class NoOpEmailService : IEmailService
{
    private readonly IEmailTemplateRenderer _renderer;
    private readonly IEmailLanguageResolver _languageResolver;
    private readonly ILogger<NoOpEmailService> _logger;

    public NoOpEmailService(
        IEmailTemplateRenderer renderer,
        IEmailLanguageResolver languageResolver,
        ILogger<NoOpEmailService> logger)
    {
        _renderer = renderer;
        _languageResolver = languageResolver;
        _logger = logger;
    }

    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "SMTP is not configured. Email would be sent to {Recipient} with subject {Subject} ({BodyLength} chars)",
            to, subject, htmlBody.Length);

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
            "SMTP is not configured. Email would be sent to {Recipient} using template {Template} in {Language} with subject {Subject}",
            to, template, language, rendered.Subject);
    }
}
