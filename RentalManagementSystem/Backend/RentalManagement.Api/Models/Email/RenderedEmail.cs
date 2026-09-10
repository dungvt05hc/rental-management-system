namespace RentalManagement.Api.Models.Email;

/// <summary>
/// Kết quả render một template: tiêu đề lấy từ thẻ <c>&lt;title&gt;</c> của file
/// template, và phần thân HTML đã thay placeholder.
/// </summary>
/// <param name="Subject">Tiêu đề email.</param>
/// <param name="HtmlBody">Nội dung HTML.</param>
public sealed record RenderedEmail(string Subject, string HtmlBody);
