using System.Security.Cryptography;
using System.Text;

namespace RentalManagement.Api.Security;

/// <summary>
/// Sinh, chuẩn hoá và băm mã mời.
/// </summary>
public static class InvitationCode
{
    /// <summary>
    /// Bảng ký tự 32 phần tử, đã bỏ I, O, 0, 1 vì mã này được đọc và chép tay.
    /// </summary>
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>
    /// Số nhóm và độ dài mỗi nhóm: 4 nhóm 5 ký tự = 20 ký tự.
    /// Mỗi ký tự cho 5 bit, nên mã có 100 bit ngẫu nhiên — dò mù là vô vọng,
    /// kể cả khi không có rate limit ở endpoint đăng ký.
    /// </summary>
    private const int GroupCount = 4;
    private const int GroupLength = 5;

    /// <summary>
    /// Sinh mã mời mới, dạng <c>ABCDE-FGHJK-LMNPQ-RSTUV</c>.
    /// </summary>
    public static string Generate()
    {
        var builder = new StringBuilder(GroupCount * GroupLength + GroupCount - 1);

        for (var group = 0; group < GroupCount; group++)
        {
            if (group > 0)
            {
                builder.Append('-');
            }

            for (var i = 0; i < GroupLength; i++)
            {
                builder.Append(Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]);
            }
        }

        return builder.ToString();
    }

    /// <summary>
    /// Đưa mã người dùng nhập về đúng dạng đã băm khi tạo: bỏ dấu gạch nối và
    /// khoảng trắng, viết hoa toàn bộ.
    /// </summary>
    /// <remarks>
    /// Không có bước này thì "abcde-fghjk..." và "ABCDEFGHJK..." băm ra hai giá
    /// trị khác nhau, và người chép mã từ email sẽ bị báo mã sai một cách vô lý.
    /// </remarks>
    public static string Normalize(string rawCode)
    {
        var builder = new StringBuilder(rawCode.Length);

        foreach (var c in rawCode)
        {
            if (c is '-' || char.IsWhiteSpace(c))
            {
                continue;
            }

            builder.Append(char.ToUpperInvariant(c));
        }

        return builder.ToString();
    }

    /// <summary>
    /// Băm mã đã chuẩn hoá. Giá trị trả về là hex chữ thường, 64 ký tự.
    /// </summary>
    public static string Hash(string rawCode)
    {
        var normalized = Normalize(rawCode);
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(digest).ToLowerInvariant();
    }

    /// <summary>
    /// Nhóm ký tự đầu của mã, dùng để nhận diện lời mời trong danh sách mà
    /// không cần lưu mã gốc.
    /// </summary>
    public static string PrefixOf(string rawCode)
    {
        var normalized = Normalize(rawCode);
        return normalized.Length <= GroupLength ? normalized : normalized[..GroupLength];
    }
}
