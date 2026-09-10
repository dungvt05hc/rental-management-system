using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Lấy ngôn ngữ email từ <c>User.PreferredLanguage</c> của tài khoản có địa chỉ
/// tương ứng.
/// </summary>
public class UserEmailLanguageResolver : IEmailLanguageResolver
{
    private readonly RentalManagementContext _context;

    public UserEmailLanguageResolver(RentalManagementContext context)
    {
        _context = context;
    }

    public async Task<string> ResolveAsync(string recipient, CancellationToken ct)
    {
        var normalizedEmail = recipient.Trim().ToUpperInvariant();

        // NormalizedEmail có sẵn index của Identity, tra theo cột này rẻ hơn
        // và khớp đúng cách Identity so sánh email.
        var preferred = await _context.Users
            .Where(u => u.NormalizedEmail == normalizedEmail)
            .Select(u => u.PreferredLanguage)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(preferred)
            ? EmailSettings.FallbackLanguage
            : preferred.Trim().ToLowerInvariant();
    }
}
