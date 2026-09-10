using System.Security.Claims;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

using RentalManagement.Api.Data;

namespace RentalManagement.Api.Security;

/// <summary>
/// Đối chiếu security stamp trong JWT với stamp hiện tại trong database.
/// </summary>
/// <remarks>
/// JWT tự nó là stateless: chữ ký hợp lệ và chưa hết hạn thì token dùng được,
/// kể cả sau khi chủ tài khoản đã đổi mật khẩu. Identity đổi
/// <c>SecurityStamp</c> mỗi lần mật khẩu thay đổi, nên so sánh stamp là cách
/// biến "đổi mật khẩu" thành "mọi phiên cũ hết hiệu lực ngay lập tức" — điều
/// kiện bắt buộc của luồng đặt lại mật khẩu, vì kẻ chiếm được tài khoản không
/// được phép tiếp tục dùng token cũ sau khi chủ tài khoản đã lấy lại quyền.
///
/// Cái giá là một truy vấn cho mỗi request đã xác thực. Đây là tra cứu theo
/// khoá chính, chỉ lấy hai cột, nên rẻ hơn nhiều so với việc dựng cả một bảng
/// revocation list.
/// </remarks>
public static class JwtSecurityStampValidator
{
    /// <summary>
    /// Từ chối token khi tài khoản không còn tồn tại, đã bị vô hiệu hoá, hoặc
    /// stamp đã đổi kể từ lúc token được phát hành.
    /// </summary>
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;

        var userId = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var tokenStamp = principal?.FindFirst(AuthClaimTypes.SecurityStamp)?.Value;

        // Token phát hành trước khi tính năng này tồn tại thì không có stamp.
        // Từ chối luôn: chấp nhận token thiếu stamp là để ngỏ đúng lỗ hổng mà
        // lớp kiểm tra này sinh ra để bịt. Hệ quả là mọi người phải đăng nhập
        // lại một lần sau khi triển khai.
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tokenStamp))
        {
            context.Fail("Token is missing the security stamp claim.");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<RentalManagementContext>();

        var account = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.SecurityStamp, u.IsActive })
            .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

        if (account is null || !account.IsActive)
        {
            context.Fail("The account no longer exists or is inactive.");
            return;
        }

        if (!string.Equals(account.SecurityStamp, tokenStamp, StringComparison.Ordinal))
        {
            context.Fail("The security stamp has changed since this token was issued.");
        }
    }
}
