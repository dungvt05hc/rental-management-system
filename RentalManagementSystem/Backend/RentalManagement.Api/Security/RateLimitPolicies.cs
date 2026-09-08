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
}
