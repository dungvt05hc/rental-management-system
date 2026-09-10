namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Giới hạn số email gửi tới cùng một địa chỉ trong một cửa sổ thời gian.
/// </summary>
public interface IEmailRateLimiter
{
    /// <summary>
    /// Xin một suất gửi cho địa chỉ này.
    /// </summary>
    /// <returns><c>false</c> nếu đã chạm giới hạn — email không được gửi.</returns>
    bool TryAcquire(string recipient);
}
