using RentalManagement.Api.Security;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Mật khẩu sinh tự động cho tài khoản do admin tạo. Điều đang kiểm tra:
/// mật khẩu luôn thoả policy của Identity, và không lộ cấu trúc cố định.
/// Logic thuần nên không cần database.
/// </summary>
public class PasswordGeneratorTests
{
    private const string Uppercase = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
    private const string Lowercase = "abcdefghijkmnopqrstuvwxyz";
    private const string Digits = "0123456789";
    private const string Special = "!@#$%^&*";

    [Fact]
    public void Generates_a_password_of_the_declared_length()
    {
        Assert.Equal(PasswordGenerator.Length, PasswordGenerator.Generate().Length);
    }

    [Fact]
    public void Is_long_enough_for_the_identity_policy()
    {
        // Program.cs đặt Password.RequiredLength = 10
        Assert.True(PasswordGenerator.Length >= 10);
    }

    [Fact]
    public void Always_contains_at_least_one_character_from_every_required_group()
    {
        // Chạy nhiều lần vì đây là hành vi ngẫu nhiên: một lần chạy đúng
        // không chứng minh được bất biến này luôn giữ.
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var password = PasswordGenerator.Generate();

            Assert.Contains(password, c => Uppercase.Contains(c));
            Assert.Contains(password, c => Lowercase.Contains(c));
            Assert.Contains(password, c => Digits.Contains(c));
            Assert.Contains(password, c => Special.Contains(c));
        }
    }

    [Fact]
    public void Only_uses_characters_from_the_declared_groups()
    {
        var allowed = Uppercase + Lowercase + Digits + Special;

        for (var attempt = 0; attempt < 50; attempt++)
        {
            Assert.All(PasswordGenerator.Generate(), c => Assert.Contains(c, allowed));
        }
    }

    [Fact]
    public void Does_not_leave_the_required_characters_in_a_fixed_order()
    {
        // Nếu quên bước xáo, vị trí 0 luôn là chữ hoa, vị trí 1 luôn là chữ
        // thường… Kiểm tra rằng vị trí đầu tiên không phải lúc nào cũng hoa.
        var firstCharacters = Enumerable.Range(0, 200)
            .Select(_ => PasswordGenerator.Generate()[0])
            .ToList();

        Assert.Contains(firstCharacters, c => !Uppercase.Contains(c));
    }

    [Fact]
    public void Does_not_repeat_itself_across_calls()
    {
        var generated = Enumerable.Range(0, 100)
            .Select(_ => PasswordGenerator.Generate())
            .ToHashSet();

        Assert.Equal(100, generated.Count);
    }
}
