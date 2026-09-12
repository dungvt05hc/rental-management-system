using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Quản lý mã mời: Admin sinh mã gắn sẵn role, và luồng đăng ký tiêu mã đó.
/// </summary>
public interface IInvitationService
{
    /// <summary>
    /// Sinh một mã mời mới.
    /// </summary>
    /// <param name="request">Role, hạn dùng và ràng buộc email (nếu có)</param>
    /// <param name="createdByUserId">Id của Admin đang thao tác</param>
    /// <param name="ct">Token hủy</param>
    /// <returns>Lời mời vừa tạo, kèm mã gốc — lần duy nhất mã được trả về</returns>
    Task<ApiResponse<CreatedInvitationDto>> CreateAsync(
        CreateInvitationDto request, string createdByUserId, CancellationToken ct = default);

    /// <summary>
    /// Liệt kê mọi lời mời, mới nhất trước.
    /// </summary>
    /// <param name="ct">Token hủy</param>
    Task<ApiResponse<IReadOnlyList<InvitationDto>>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Thu hồi một lời mời chưa dùng.
    /// </summary>
    /// <param name="id">Id của lời mời</param>
    /// <param name="revokedByUserId">Id của Admin đang thao tác</param>
    /// <param name="ct">Token hủy</param>
    Task<ApiResponse<bool>> RevokeAsync(Guid id, string revokedByUserId, CancellationToken ct = default);

    /// <summary>
    /// Giữ chỗ mã mời cho một lần đăng ký, nếu mã còn dùng được cho địa chỉ email này.
    /// </summary>
    /// <remarks>
    /// Đây là bước ĐẦU TIÊN của việc đăng ký, trước cả khi tạo user: thao tác
    /// đánh dấu là một câu UPDATE có điều kiện, nên hai request cùng mang một mã
    /// thì chỉ đúng một request thấy dòng bị đổi. Nếu các bước sau hỏng, người
    /// gọi phải trả mã lại bằng <see cref="ReleaseClaimAsync"/>.
    ///
    /// Trả về null cho mọi lý do không dùng được — sai mã, hết hạn, đã dùng, đã
    /// thu hồi, sai email — để người gọi không thể dò ra mã nào từng tồn tại.
    /// </remarks>
    /// <param name="rawCode">Mã người dùng nhập, chưa chuẩn hoá</param>
    /// <param name="email">Địa chỉ email đang đăng ký</param>
    /// <param name="ct">Token hủy</param>
    Task<Invitation?> TryClaimAsync(string rawCode, string email, CancellationToken ct = default);

    /// <summary>
    /// Gắn tài khoản vừa tạo vào lời mời đã giữ chỗ.
    /// </summary>
    /// <param name="invitationId">Id lời mời đang giữ chỗ</param>
    /// <param name="userId">Id tài khoản vừa tạo</param>
    /// <param name="ct">Token hủy</param>
    Task ConfirmClaimAsync(Guid invitationId, string userId, CancellationToken ct = default);

    /// <summary>
    /// Trả mã về trạng thái dùng được, khi việc đăng ký hỏng sau lúc giữ chỗ.
    /// </summary>
    /// <param name="invitationId">Id lời mời đang giữ chỗ</param>
    /// <param name="ct">Token hủy</param>
    Task ReleaseClaimAsync(Guid invitationId, CancellationToken ct = default);
}
