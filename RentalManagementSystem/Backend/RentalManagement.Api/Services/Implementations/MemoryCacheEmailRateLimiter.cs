using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Cửa sổ cố định theo địa chỉ người nhận, lưu trong <see cref="IMemoryCache"/>.
/// </summary>
/// <remarks>
/// Bộ đếm nằm trong bộ nhớ của một process: chạy nhiều instance thì mỗi instance
/// đếm riêng, và restart là đếm lại từ đầu. Đủ cho quy mô hiện tại — mục tiêu là
/// chặn người dùng bấm "Quên mật khẩu" liên tục, không phải chống tấn công.
/// </remarks>
public class MemoryCacheEmailRateLimiter : IEmailRateLimiter
{
    private const string KeyPrefix = "email:ratelimit:";

    /// <summary>
    /// Đọc-rồi-ghi trên cache không phải thao tác nguyên tử, nên hai request
    /// song song tới cùng một địa chỉ có thể cùng vượt qua giới hạn nếu không khoá.
    /// </summary>
    private static readonly Lock Gate = new();

    private readonly IMemoryCache _cache;
    private readonly EmailSettings _settings;
    private readonly ILogger<MemoryCacheEmailRateLimiter> _logger;

    public MemoryCacheEmailRateLimiter(
        IMemoryCache cache,
        IOptions<EmailSettings> settings,
        ILogger<MemoryCacheEmailRateLimiter> logger)
    {
        _cache = cache;
        _settings = settings.Value;
        _logger = logger;
    }

    public bool TryAcquire(string recipient)
    {
        var key = KeyPrefix + recipient.Trim().ToLowerInvariant();

        lock (Gate)
        {
            var used = _cache.Get<int?>(key) ?? 0;

            if (used >= _settings.RateLimitMaxPerWindow)
            {
                _logger.LogWarning(
                    "Email rate limit reached: {Used}/{Limit} within {Window} for one recipient",
                    used, _settings.RateLimitMaxPerWindow, _settings.RateLimitWindow);
                return false;
            }

            // Hết hạn tuyệt đối tính từ email đầu tiên: cửa sổ không bị đẩy lùi
            // mỗi lần gửi, nếu không một người bấm đều tay sẽ không bao giờ hết hạn.
            _cache.Set(key, used + 1, _settings.RateLimitWindow);
            return true;
        }
    }
}
