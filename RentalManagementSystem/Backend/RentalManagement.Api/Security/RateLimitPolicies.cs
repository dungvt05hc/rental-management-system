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

    /// <summary>
    /// Giới hạn theo IP cho endpoint tự đăng ký.
    /// </summary>
    /// <remarks>
    /// Endpoint này ẩn danh và tạo ra dữ liệu (tài khoản + email gửi đi), nên
    /// hạn mức chặt hơn hẳn đăng nhập. Nó cũng là nơi mã mời bị đem ra thử, tuy
    /// mã có 100 bit ngẫu nhiên nên rate limit không phải tuyến phòng thủ chính.
    /// </remarks>
    public const string Register = "register";

    /// <summary>
    /// Giới hạn theo IP cho endpoint kiểm tra email đã tồn tại.
    /// </summary>
    /// <remarks>
    /// Endpoint này trả lời đúng câu hỏi "địa chỉ này có tài khoản không", nên
    /// tự nó là một kênh user enumeration. Form đăng ký cần nó để báo trùng
    /// email ngay khi rời ô nhập; đổi lại phải có hạn mức đủ chặt để không ai
    /// quét được cả danh sách địa chỉ.
    /// </remarks>
    public const string CheckEmail = "check-email";

    /// <summary>
    /// Giới hạn theo IP cho endpoint gửi lại email xác nhận.
    /// </summary>
    public const string ResendConfirmation = "resend-confirmation";
}
