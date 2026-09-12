using System.ComponentModel.DataAnnotations;

using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO Admin gửi lên để sinh một mã mời mới
/// </summary>
public class CreateInvitationDto
{
    /// <summary>
    /// Role mà tài khoản đăng ký bằng mã này sẽ nhận
    /// </summary>
    [Required]
    [StringLength(50)]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Nếu đặt, chỉ đúng địa chỉ email này mới dùng được mã
    /// </summary>
    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    /// <summary>
    /// Số ngày mã còn hiệu lực, tính từ lúc tạo
    /// </summary>
    [Range(1, 90)]
    public int ExpiresInDays { get; set; } = 7;

    /// <summary>
    /// Ghi chú tự do, ví dụ tên người được mời
    /// </summary>
    [StringLength(200)]
    public string? Note { get; set; }
}

/// <summary>
/// DTO mô tả một lời mời trong màn hình quản lý
/// </summary>
public class InvitationDto
{
    /// <summary>
    /// Id của lời mời
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Nhóm ký tự đầu của mã, để nhận diện. Mã đầy đủ chỉ hiển thị một lần lúc tạo.
    /// </summary>
    public string CodePrefix { get; set; } = string.Empty;

    /// <summary>
    /// Role mà mã này cấp
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Địa chỉ email mà mã bị ràng buộc, hoặc null nếu mã dùng cho bất kỳ ai
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Ghi chú của Admin
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Trạng thái hiện tại, suy ra từ các mốc thời gian
    /// </summary>
    public InvitationStatus Status { get; set; }

    /// <summary>
    /// Thời điểm mã hết hạn
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Thời điểm tạo mã
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Email của Admin đã tạo mã, hoặc null nếu tài khoản đó đã bị xoá
    /// </summary>
    public string? CreatedByEmail { get; set; }

    /// <summary>
    /// Thời điểm mã được dùng
    /// </summary>
    public DateTime? RedeemedAt { get; set; }

    /// <summary>
    /// Email của tài khoản đã đăng ký bằng mã này
    /// </summary>
    public string? RedeemedByEmail { get; set; }

    /// <summary>
    /// Thời điểm mã bị thu hồi
    /// </summary>
    public DateTime? RevokedAt { get; set; }
}

/// <summary>
/// DTO trả về ngay sau khi tạo mã — lần duy nhất mã gốc rời khỏi máy chủ
/// </summary>
public class CreatedInvitationDto
{
    /// <summary>
    /// Lời mời vừa tạo
    /// </summary>
    public InvitationDto Invitation { get; set; } = null!;

    /// <summary>
    /// Mã mời đầy đủ để Admin gửi cho người được mời
    /// </summary>
    /// <remarks>
    /// Chỉ có trong response này. Database chỉ giữ bản băm, nên mã không lấy
    /// lại được; mất thì thu hồi và tạo mã mới.
    /// </remarks>
    public string Code { get; set; } = string.Empty;
}
