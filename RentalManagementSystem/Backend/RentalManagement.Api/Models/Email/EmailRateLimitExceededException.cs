namespace RentalManagement.Api.Models.Email;

/// <summary>
/// Ném ra khi một địa chỉ email đã nhận quá số email cho phép trong cửa sổ
/// rate limit. <c>ExceptionHandlerMiddleware</c> ánh xạ thành HTTP 429.
/// </summary>
public class EmailRateLimitExceededException : Exception
{
    public EmailRateLimitExceededException(string recipient)
        : base($"Email rate limit exceeded for recipient '{recipient}'")
    {
        Recipient = recipient;
    }

    /// <summary>
    /// Địa chỉ bị chặn. Chỉ dùng để log — không trả về client.
    /// </summary>
    public string Recipient { get; }
}
