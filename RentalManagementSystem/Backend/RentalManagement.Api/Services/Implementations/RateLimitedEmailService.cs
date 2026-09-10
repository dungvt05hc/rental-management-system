using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Bọc quanh <see cref="IEmailService"/> thật và chặn trước khi email được
/// render hay xếp hàng.
/// </summary>
/// <remarks>
/// Đặt ở lớp bọc thay vì bên trong từng implementation để giới hạn áp dụng như
/// nhau cho cả đường SMTP thật lẫn đường chỉ-ghi-log, nhờ đó hành vi rate limit
/// kiểm chứng được ngay trên máy dev không có SMTP.
/// </remarks>
public class RateLimitedEmailService : IEmailService
{
    private readonly IEmailService _inner;
    private readonly IEmailRateLimiter _rateLimiter;

    public RateLimitedEmailService(IEmailService inner, IEmailRateLimiter rateLimiter)
    {
        _inner = inner;
        _rateLimiter = rateLimiter;
    }

    public Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        Guard(to);
        return _inner.SendAsync(to, subject, htmlBody, ct);
    }

    public Task SendTemplateAsync(
        string to,
        EmailTemplate template,
        object model,
        CancellationToken ct = default)
    {
        Guard(to);
        return _inner.SendTemplateAsync(to, template, model, ct);
    }

    private void Guard(string to)
    {
        if (!_rateLimiter.TryAcquire(to))
        {
            throw new EmailRateLimitExceededException(to);
        }
    }
}
