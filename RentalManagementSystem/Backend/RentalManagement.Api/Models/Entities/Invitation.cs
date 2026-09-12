using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Một lời mời đăng ký do Admin sinh ra: mã mời gắn sẵn role, có hạn dùng, và
/// chỉ dùng được đúng một lần.
/// </summary>
/// <remarks>
/// Bảng này không có khoá ngoại sang AspNetUsers. Lời mời là bản ghi lịch sử —
/// nó phải trả lời được "ai đã mời ai" kể cả sau khi một trong hai tài khoản bị
/// xoá; có FK thì việc xoá user sẽ hoặc bị chặn, hoặc kéo mất luôn bản ghi.
/// Tên người mời/người dùng mã được tra lại lúc hiển thị.
/// </remarks>
public class Invitation
{
    /// <summary>
    /// Khoá chính.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// SHA-256 (hex thường) của mã mời đã chuẩn hoá.
    /// </summary>
    /// <remarks>
    /// Mã gốc không bao giờ được lưu: nó là thông tin xác thực đổi được lấy một
    /// tài khoản có role. Không thêm salt là cố ý — mã có 100 bit ngẫu nhiên nên
    /// không có từ điển hay bảng tra nào duyệt nổi, và hash không salt cho phép
    /// tra cứu bằng một chỉ mục duy nhất khi người dùng nhập mã.
    /// </remarks>
    [MaxLength(64)]
    public string CodeHash { get; set; } = string.Empty;

    /// <summary>
    /// Nhóm ký tự đầu của mã, để Admin nhận ra dòng nào là mã nào trong danh sách.
    /// </summary>
    [MaxLength(8)]
    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>
    /// Role sẽ được gán cho tài khoản đăng ký bằng mã này.
    /// </summary>
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Nếu đặt, mã chỉ dùng được cho đúng địa chỉ email này (đã chuẩn hoá về
    /// chữ thường). Null nghĩa là ai cầm mã cũng dùng được.
    /// </summary>
    [MaxLength(256)]
    public string? Email { get; set; }

    /// <summary>
    /// Ghi chú tự do của Admin, ví dụ tên người được mời.
    /// </summary>
    [MaxLength(200)]
    public string? Note { get; set; }

    /// <summary>
    /// Thời điểm mã hết hạn.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Thời điểm tạo mã.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Id của Admin đã tạo mã.
    /// </summary>
    [MaxLength(450)]
    public string CreatedByUserId { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm mã được dùng. Khác null nghĩa là mã đã bị tiêu.
    /// </summary>
    public DateTime? RedeemedAt { get; set; }

    /// <summary>
    /// Tài khoản được tạo ra từ mã này.
    /// </summary>
    /// <remarks>
    /// Có thể còn null trong lúc <see cref="RedeemedAt"/> đã được đặt: đăng ký
    /// giữ chỗ mã trước rồi mới tạo user, để hai request đồng thời không cùng
    /// tiêu một mã.
    /// </remarks>
    [MaxLength(450)]
    public string? RedeemedByUserId { get; set; }

    /// <summary>
    /// Thời điểm Admin thu hồi mã.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Id của Admin đã thu hồi mã.
    /// </summary>
    [MaxLength(450)]
    public string? RevokedByUserId { get; set; }
}

/// <summary>
/// Trạng thái hiển thị của một lời mời. Không lưu trong database — suy ra từ
/// các mốc thời gian, nên không thể lệch với dữ liệu thật.
/// </summary>
public enum InvitationStatus
{
    /// <summary>
    /// Còn hạn và chưa ai dùng.
    /// </summary>
    Pending,

    /// <summary>
    /// Đã có người đăng ký bằng mã này.
    /// </summary>
    Redeemed,

    /// <summary>
    /// Admin đã thu hồi.
    /// </summary>
    Revoked,

    /// <summary>
    /// Quá hạn mà chưa ai dùng.
    /// </summary>
    Expired
}
