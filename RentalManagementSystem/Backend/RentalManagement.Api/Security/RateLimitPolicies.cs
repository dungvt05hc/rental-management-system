namespace RentalManagement.Api.Security;

/// <summary>
/// Tên các rate limiting policy, dùng chung giữa Program.cs (nơi đăng ký)
/// và controller (nơi gắn [EnableRateLimiting]).
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>
    /// Giới hạn theo IP cho endpoint đăng nhập.
    /// </summary>
    public const string Login = "login";

    /// <summary>
    /// Giới hạn theo IP cho endpoint quên mật khẩu.
    /// </summary>
    /// <remarks>
    /// Chỉ chặn theo IP. Giới hạn theo địa chỉ email nằm ở
    /// <see cref="Services.Interfaces.IEmailRateLimiter"/>, vì email nằm trong
    /// body — rate limiter của ASP.NET phân vùng trước khi body được đọc nên
    /// không thấy được giá trị đó.
    /// </remarks>
    public const string ForgotPassword = "forgot-password";
}
