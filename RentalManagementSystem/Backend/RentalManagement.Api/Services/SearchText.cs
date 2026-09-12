using System.Globalization;
using System.Text;

namespace RentalManagement.Api.Services;

/// <summary>
/// Chuẩn hoá chuỗi tìm kiếm: bỏ dấu, hạ chữ thường.
/// </summary>
/// <remarks>
/// Phải khớp với cột generated <c>SearchText</c> trong PostgreSQL, vốn dùng
/// <c>lower(immutable_unaccent(...))</c>. Từ khoá người dùng gõ được chuẩn hoá ở
/// đây rồi mới so với cột đã chuẩn hoá sẵn — nhờ vậy "nguyen van an",
/// "Nguyễn Văn An" hay "NGUYEN VAN AN" đều ra cùng một kết quả.
/// </remarks>
public static class SearchText
{
    /// <summary>
    /// Chữ Đ/đ của tiếng Việt không phải là D kèm dấu phụ mà là một ký tự riêng,
    /// nên chuẩn hoá Unicode không tách nó ra được — phải thay tay.
    /// PostgreSQL unaccent xử lý cặp này giống hệt, nên hai bên vẫn khớp nhau.
    /// </summary>
    private const string StrokedD = "Đđ";

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);

        foreach (var character in value.Trim().Normalize(NormalizationForm.FormD))
        {
            if (StrokedD.Contains(character))
            {
                builder.Append('d');
                continue;
            }

            // Dấu thanh và dấu phụ tách ra sau FormD nằm ở nhóm NonSpacingMark.
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(character);
        }

        return builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();
    }
}
