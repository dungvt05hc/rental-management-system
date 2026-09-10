using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Tiến trình nền rút email khỏi hàng đợi và gửi lần lượt. Đây là nơi duy nhất
/// chờ máy chủ SMTP, nên không request nào bị chặn vì email.
/// </summary>
public class EmailQueueProcessor : BackgroundService
{
    private readonly IEmailQueue _queue;
    private readonly IEmailSender _sender;
    private readonly ILogger<EmailQueueProcessor> _logger;

    public EmailQueueProcessor(
        IEmailQueue queue,
        IEmailSender sender,
        ILogger<EmailQueueProcessor> logger)
    {
        _queue = queue;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email queue processor started");

        try
        {
            await foreach (var message in _queue.DequeueAllAsync(stoppingToken))
            {
                await DeliverSafelyAsync(message, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Ứng dụng đang tắt — không phải lỗi.
        }

        _logger.LogInformation("Email queue processor stopped");
    }

    private async Task DeliverSafelyAsync(EmailMessage message, CancellationToken ct)
    {
        try
        {
            await _sender.DeliverAsync(message, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Một email hỏng không được phép làm chết vòng lặp, nếu không mọi
            // email sau đó sẽ nằm lại trong hàng đợi mà không ai gửi.
            _logger.LogError(
                ex,
                "Failed to send email with subject {Subject}. The message is dropped.",
                message.Subject);
        }
    }
}
