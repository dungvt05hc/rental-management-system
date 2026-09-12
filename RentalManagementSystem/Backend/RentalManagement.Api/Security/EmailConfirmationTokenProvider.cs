using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace RentalManagement.Api.Security;

/// <summary>
/// Tuỳ chọn riêng cho token xác nhận email, tách khỏi
/// <see cref="DataProtectionTokenProviderOptions"/> dùng chung.
/// </summary>
/// <remarks>
/// Tồn tại chỉ để token xác nhận email có thời hạn riêng. Program.cs đặt
/// <see cref="DataProtectionTokenProviderOptions.TokenLifespan"/> chung là 1 giờ
/// cho link đặt lại mật khẩu — hợp lý với một link đổi được mật khẩu, nhưng quá
/// ngắn cho email chào mừng mà người ta có thể chỉ mở vào tối hôm sau.
/// </remarks>
public class EmailConfirmationTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public EmailConfirmationTokenProviderOptions()
    {
        Name = ProviderName;

        // Khớp với "{{ExpiryHours}} giờ" ghi trong template EmailConfirmation.
        TokenLifespan = TimeSpan.FromHours(24);
    }

    /// <summary>
    /// Tên provider, dùng chung giữa nơi đăng ký (Program.cs) và
    /// <c>IdentityOptions.Tokens.EmailConfirmationTokenProvider</c>.
    /// </summary>
    public const string ProviderName = "EmailConfirmation";
}

/// <summary>
/// Provider sinh token xác nhận email, giống hệt provider mặc định của Identity
/// nhưng đọc thời hạn từ <see cref="EmailConfirmationTokenProviderOptions"/>.
/// </summary>
public class EmailConfirmationTokenProvider<TUser> : DataProtectorTokenProvider<TUser>
    where TUser : class
{
    public EmailConfirmationTokenProvider(
        IDataProtectionProvider dataProtectionProvider,
        IOptions<EmailConfirmationTokenProviderOptions> options,
        ILogger<DataProtectorTokenProvider<TUser>> logger)
        : base(dataProtectionProvider, options, logger)
    {
    }
}
