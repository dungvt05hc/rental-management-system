using RentalManagement.Api.Models.Email;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Đọc template HTML nhúng trong assembly và thay các placeholder
/// <c>{{TênThuộcTính}}</c> bằng giá trị lấy từ model.
/// </summary>
public interface IEmailTemplateRenderer
{
    /// <summary>
    /// Render template theo ngôn ngữ yêu cầu.
    /// </summary>
    /// <param name="template">Template cần render.</param>
    /// <param name="language">Mã ngôn ngữ ("vi", "en"). Không có file tương ứng thì lùi về tiếng Việt.</param>
    /// <param name="model">Đối tượng cung cấp giá trị placeholder; <c>null</c> nghĩa là template không có placeholder nào.</param>
    /// <exception cref="InvalidOperationException">
    /// Template không tồn tại, hoặc model thiếu một placeholder mà template dùng.
    /// </exception>
    RenderedEmail Render(EmailTemplate template, string language, object? model);
}
