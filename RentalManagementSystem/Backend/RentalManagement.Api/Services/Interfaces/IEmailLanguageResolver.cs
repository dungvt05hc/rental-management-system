namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Xác định ngôn ngữ dùng cho email gửi tới một địa chỉ.
/// </summary>
public interface IEmailLanguageResolver
{
    /// <summary>
    /// Trả về mã ngôn ngữ cho người nhận: lấy <c>User.PreferredLanguage</c> nếu
    /// địa chỉ ứng với một tài khoản đã chọn ngôn ngữ, ngược lại là tiếng Việt.
    /// </summary>
    Task<string> ResolveAsync(string recipient, CancellationToken ct);
}
