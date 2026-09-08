using System.Security.Cryptography;

namespace RentalManagement.Api.Security;

/// <summary>
/// Sinh mật khẩu ngẫu nhiên cho tài khoản được admin tạo mà không đặt sẵn
/// mật khẩu. Dùng RandomNumberGenerator (CSPRNG) chứ không phải Random:
/// Random gieo theo thời gian và đoán được, mà đây là mật khẩu đăng nhập.
/// </summary>
public static class PasswordGenerator
{
    /// <summary>
    /// Độ dài mật khẩu sinh ra. Phải >= Password.RequiredLength khai báo trong
    /// Program.cs, nếu không mật khẩu sinh ra sẽ bị chính Identity từ chối.
    /// </summary>
    public const int Length = 12;

    /// <summary>
    /// Các nhóm ký tự bắt buộc phải có mặt, đã bỏ những ký tự dễ nhìn nhầm
    /// (I, l, O, 0) vì mật khẩu này thường được đọc/chép tay cho người dùng.
    /// </summary>
    private static readonly string[] CharacterGroups =
    {
        "ABCDEFGHJKLMNOPQRSTUVWXYZ",
        "abcdefghijkmnopqrstuvwxyz",
        "0123456789",
        "!@#$%^&*"
    };

    /// <summary>
    /// Sinh một mật khẩu thoả policy: đủ độ dài và có ít nhất một ký tự từ
    /// mỗi nhóm (hoa, thường, số, ký tự đặc biệt).
    /// </summary>
    public static string Generate()
    {
        var chars = new List<char>(Length);

        // Mỗi nhóm góp ít nhất một ký tự để chắc chắn thoả policy của Identity
        foreach (var group in CharacterGroups)
        {
            chars.Add(group[RandomNumberGenerator.GetInt32(group.Length)]);
        }

        // Phần còn lại lấy từ toàn bộ bảng ký tự
        var allCharacters = string.Concat(CharacterGroups);
        while (chars.Count < Length)
        {
            chars.Add(allCharacters[RandomNumberGenerator.GetInt32(allCharacters.Length)]);
        }

        // Fisher–Yates: không xáo thì 4 ký tự đầu luôn theo đúng thứ tự
        // hoa - thường - số - đặc biệt, lộ mất cấu trúc mật khẩu.
        for (var i = chars.Count - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars.ToArray());
    }
}
