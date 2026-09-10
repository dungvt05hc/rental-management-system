namespace RentalManagement.Api.Security;

/// <summary>
/// Tên các claim tự đặt trong JWT, dùng chung giữa nơi phát hành token
/// (<c>AuthService</c>) và nơi kiểm tra token (<see cref="JwtSecurityStampValidator"/>).
/// </summary>
public static class AuthClaimTypes
{
    /// <summary>
    /// Security stamp của tài khoản tại thời điểm token được phát hành.
    /// </summary>
    /// <remarks>
    /// Trùng tên với claim mặc định của ASP.NET Identity để không phải đặt ra
    /// một quy ước riêng cho cùng một khái niệm.
    /// </remarks>
    public const string SecurityStamp = "AspNet.Identity.SecurityStamp";
}
