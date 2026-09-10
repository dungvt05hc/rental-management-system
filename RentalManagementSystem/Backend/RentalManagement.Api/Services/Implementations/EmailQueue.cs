using System.Threading.Channels;

using Microsoft.Extensions.Options;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Hàng đợi email dựa trên <see cref="Channel{T}"/>, giới hạn sức chứa để một
/// máy chủ SMTP chết không làm bộ nhớ phình theo số request.
/// </summary>
public class EmailQueue : IEmailQueue
{
    private readonly Channel<EmailMessage> _channel;

    public EmailQueue(IOptions<EmailSettings> settings)
    {
        // DropWrite: khi đầy thì TryWrite trả về false ngay thay vì chặn người
        // gọi — chặn ở đây sẽ đúng bằng việc để request chờ SMTP, thứ mà cả
        // hàng đợi này sinh ra để tránh.
        _channel = Channel.CreateBounded<EmailMessage>(
            new BoundedChannelOptions(settings.Value.QueueCapacity)
            {
                FullMode = BoundedChannelFullMode.DropWrite,
                SingleReader = true,
                SingleWriter = false
            });
    }

    public bool TryEnqueue(EmailMessage message) => _channel.Writer.TryWrite(message);

    public IAsyncEnumerable<EmailMessage> DequeueAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
