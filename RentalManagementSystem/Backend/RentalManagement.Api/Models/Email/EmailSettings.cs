namespace RentalManagement.Api.Models.Email;

/// <summary>
/// Cấu hình SMTP, đọc hoàn toàn từ biến môi trường — không có giá trị nào
/// được hard-code hay đặt trong appsettings, để mật khẩu SMTP không bao giờ
/// nằm trong repo.
/// </summary>
public class EmailSettings
{
    /// <summary>
    /// Ngôn ngữ dùng khi người nhận chưa chọn ngôn ngữ nào.
    /// </summary>
    public const string FallbackLanguage = "vi";

    /// <summary>Máy chủ SMTP (<c>SMTP_HOST</c>). Rỗng nghĩa là chưa cấu hình.</summary>
    public string Host { get; set; } = string.Empty;

    /// <summary>Cổng SMTP (<c>SMTP_PORT</c>), mặc định 587 (STARTTLS).</summary>
    public int Port { get; set; } = 587;

    /// <summary>Tài khoản SMTP (<c>SMTP_USER</c>). Bỏ trống nếu máy chủ không yêu cầu xác thực.</summary>
    public string User { get; set; } = string.Empty;

    /// <summary>Mật khẩu SMTP (<c>SMTP_PASSWORD</c>).</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>Địa chỉ người gửi (<c>SMTP_FROM_EMAIL</c>).</summary>
    public string FromEmail { get; set; } = string.Empty;

    /// <summary>Tên hiển thị của người gửi (<c>SMTP_FROM_NAME</c>).</summary>
    public string FromName { get; set; } = string.Empty;

    /// <summary>
    /// Số email tối đa gửi tới cùng một địa chỉ trong một cửa sổ thời gian.
    /// </summary>
    public int RateLimitMaxPerWindow { get; set; } = 3;

    /// <summary>
    /// Độ dài cửa sổ rate limit, tính từ email đầu tiên gửi tới địa chỉ đó.
    /// </summary>
    public TimeSpan RateLimitWindow { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Sức chứa hàng đợi trong process. Vượt quá thì email mới bị loại bỏ
    /// kèm log lỗi, thay vì để hàng đợi phình vô hạn.
    /// </summary>
    public int QueueCapacity { get; set; } = 1000;

    /// <summary>
    /// Có đủ thông tin để gửi email thật hay không. Chỉ cần thiếu host là
    /// toàn bộ hệ thống chuyển sang chế độ chỉ ghi log.
    /// </summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);

    /// <summary>
    /// Đọc cấu hình từ biến môi trường.
    /// </summary>
    public static EmailSettings FromEnvironment()
    {
        var settings = new EmailSettings
        {
            Host = Read("SMTP_HOST"),
            User = Read("SMTP_USER"),
            Password = Read("SMTP_PASSWORD"),
            FromEmail = Read("SMTP_FROM_EMAIL"),
            FromName = Read("SMTP_FROM_NAME")
        };

        if (int.TryParse(Read("SMTP_PORT"), out var port) && port > 0)
        {
            settings.Port = port;
        }

        // Nhiều nhà cung cấp bắt buộc From phải trùng tài khoản đăng nhập,
        // nên khi thiếu SMTP_FROM_EMAIL thì lấy luôn SMTP_USER là suy đoán đúng
        // trong đa số trường hợp.
        if (string.IsNullOrWhiteSpace(settings.FromEmail))
        {
            settings.FromEmail = settings.User;
        }

        return settings;
    }

    private static string Read(string name) =>
        Environment.GetEnvironmentVariable(name)?.Trim() ?? string.Empty;
}
