using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Security;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Quản lý vòng đời mã mời: tạo, liệt kê, thu hồi, và giữ chỗ khi có người đăng ký.
/// </summary>
public class InvitationService : IInvitationService
{
    private readonly RentalManagementContext _context;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<InvitationService> _logger;

    public InvitationService(
        RentalManagementContext context,
        RoleManager<IdentityRole> roleManager,
        ILogger<InvitationService> logger)
    {
        _context = context;
        _roleManager = roleManager;
        _logger = logger;
    }

    /// <summary>
    /// Sinh một mã mời mới
    /// </summary>
    public async Task<ApiResponse<CreatedInvitationDto>> CreateAsync(
        CreateInvitationDto request, string createdByUserId, CancellationToken ct = default)
    {
        var role = request.Role.Trim();

        if (!await _roleManager.RoleExistsAsync(role))
        {
            return ApiResponse<CreatedInvitationDto>.ErrorResponse("Role does not exist");
        }

        var email = NormalizeEmail(request.Email);

        if (email is not null && await _context.Users.AnyAsync(u => u.NormalizedEmail == email.ToUpperInvariant(), ct))
        {
            return ApiResponse<CreatedInvitationDto>.ErrorResponse(
                "That email address already has an account");
        }

        var code = InvitationCode.Generate();
        var now = DateTime.UtcNow;

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            CodeHash = InvitationCode.Hash(code),
            CodePrefix = InvitationCode.PrefixOf(code),
            Role = role,
            Email = email,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            ExpiresAt = now.AddDays(request.ExpiresInDays),
            CreatedAt = now,
            CreatedByUserId = createdByUserId
        };

        _context.Invitations.Add(invitation);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Invitation {InvitationId} for role {Role} created by user {UserId}",
            invitation.Id, role, createdByUserId);

        var dtos = await MapAsync(new[] { invitation }, ct);

        return ApiResponse<CreatedInvitationDto>.SuccessResponse(
            new CreatedInvitationDto { Invitation = dtos[0], Code = code },
            "Invitation created. Copy the code now — it is not shown again.");
    }

    /// <summary>
    /// Liệt kê mọi lời mời, mới nhất trước
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<InvitationDto>>> GetAllAsync(CancellationToken ct = default)
    {
        var invitations = await _context.Invitations
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        return ApiResponse<IReadOnlyList<InvitationDto>>.SuccessResponse(await MapAsync(invitations, ct));
    }

    /// <summary>
    /// Thu hồi một lời mời chưa dùng
    /// </summary>
    public async Task<ApiResponse<bool>> RevokeAsync(
        Guid id, string revokedByUserId, CancellationToken ct = default)
    {
        var invitation = await _context.Invitations.FirstOrDefaultAsync(i => i.Id == id, ct);

        if (invitation is null)
        {
            return ApiResponse<bool>.ErrorResponse("Invitation not found");
        }

        if (invitation.RedeemedAt is not null)
        {
            // Thu hồi mã đã dùng không lấy lại được tài khoản đã tạo, nên nói
            // thẳng thay vì báo thành công giả. Muốn chặn người đó thì vô hiệu
            // hoá tài khoản ở màn hình quản lý người dùng.
            return ApiResponse<bool>.ErrorResponse(
                "This invitation has already been used. Deactivate the account instead.");
        }

        if (invitation.RevokedAt is not null)
        {
            return ApiResponse<bool>.SuccessResponse(true, "Invitation was already revoked");
        }

        invitation.RevokedAt = DateTime.UtcNow;
        invitation.RevokedByUserId = revokedByUserId;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Invitation {InvitationId} revoked by user {UserId}", id, revokedByUserId);

        return ApiResponse<bool>.SuccessResponse(true, "Invitation revoked");
    }

    /// <summary>
    /// Giữ chỗ mã mời cho một lần đăng ký
    /// </summary>
    public async Task<Invitation?> TryClaimAsync(
        string rawCode, string email, CancellationToken ct = default)
    {
        var hash = InvitationCode.Hash(rawCode);
        var normalizedEmail = NormalizeEmail(email);
        var now = DateTime.UtcNow;

        // Chỗ giữ bị bỏ dở quá lâu thì coi như không còn ai giữ. Không có mốc
        // này, một tiến trình chết đúng giữa lúc giữ chỗ và lúc tạo user sẽ
        // khoá vĩnh viễn mã đó: RedeemedAt đã đặt mà không có tài khoản nào ứng
        // với nó, và không đường nào mở lại được.
        var staleClaimCutoff = now.AddMinutes(-5);

        // Một câu UPDATE ... WHERE duy nhất: database quyết định ai giành được
        // mã. Nếu đọc rồi mới ghi thì hai request song song đều đọc thấy mã còn
        // trống và cùng tạo ra một tài khoản.
        var claimed = await _context.Invitations
            .Where(i => i.CodeHash == hash
                && (i.RedeemedAt == null
                    || (i.RedeemedByUserId == null && i.RedeemedAt < staleClaimCutoff))
                && i.RevokedAt == null
                && i.ExpiresAt > now
                && (i.Email == null || i.Email == normalizedEmail))
            .ExecuteUpdateAsync(setters => setters.SetProperty(i => i.RedeemedAt, now), ct);

        if (claimed == 0)
        {
            return null;
        }

        return await _context.Invitations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.CodeHash == hash, ct);
    }

    /// <summary>
    /// Gắn tài khoản vừa tạo vào lời mời đã giữ chỗ
    /// </summary>
    public async Task ConfirmClaimAsync(
        Guid invitationId, string userId, CancellationToken ct = default)
    {
        await _context.Invitations
            .Where(i => i.Id == invitationId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(i => i.RedeemedByUserId, userId), ct);
    }

    /// <summary>
    /// Trả mã về trạng thái dùng được sau khi đăng ký hỏng
    /// </summary>
    public async Task ReleaseClaimAsync(Guid invitationId, CancellationToken ct = default)
    {
        // Điều kiện RedeemedByUserId == null giữ cho việc dọn dẹp một lần đăng ký
        // hỏng không bao giờ mở lại được mã đã thật sự tạo ra tài khoản.
        await _context.Invitations
            .Where(i => i.Id == invitationId && i.RedeemedByUserId == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(i => i.RedeemedAt, (DateTime?)null), ct);
    }

    /// <summary>
    /// Chuyển entity sang DTO, tra thêm email của người tạo và người đã dùng mã.
    /// </summary>
    private async Task<List<InvitationDto>> MapAsync(
        IReadOnlyCollection<Invitation> invitations, CancellationToken ct)
    {
        if (invitations.Count == 0)
        {
            return new List<InvitationDto>();
        }

        // Không có khoá ngoại sang AspNetUsers (xem Invitation), nên email được
        // tra một lượt ở đây thay vì đi kèm bản ghi.
        var userIds = invitations
            .Select(i => i.CreatedByUserId)
            .Concat(invitations.Select(i => i.RedeemedByUserId).OfType<string>())
            .Distinct()
            .ToList();

        var emailById = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email })
            .ToDictionaryAsync(u => u.Id, u => u.Email, ct);

        var now = DateTime.UtcNow;

        return invitations.Select(invitation => new InvitationDto
        {
            Id = invitation.Id,
            CodePrefix = invitation.CodePrefix,
            Role = invitation.Role,
            Email = invitation.Email,
            Note = invitation.Note,
            Status = ResolveStatus(invitation, now),
            ExpiresAt = invitation.ExpiresAt,
            CreatedAt = invitation.CreatedAt,
            CreatedByEmail = LookUp(emailById, invitation.CreatedByUserId),
            RedeemedAt = invitation.RedeemedByUserId is null ? null : invitation.RedeemedAt,
            RedeemedByEmail = LookUp(emailById, invitation.RedeemedByUserId),
            RevokedAt = invitation.RevokedAt
        }).ToList();
    }

    /// <summary>
    /// Trạng thái hiển thị, suy ra từ các mốc thời gian.
    /// </summary>
    private static InvitationStatus ResolveStatus(Invitation invitation, DateTime now)
    {
        // Chỉ tính là đã dùng khi có tài khoản gắn vào. RedeemedAt đơn độc là
        // một lần giữ chỗ đang dở, không phải một lời mời đã tiêu.
        if (invitation.RedeemedByUserId is not null) return InvitationStatus.Redeemed;
        if (invitation.RevokedAt is not null) return InvitationStatus.Revoked;
        if (invitation.ExpiresAt <= now) return InvitationStatus.Expired;
        return InvitationStatus.Pending;
    }

    private static string? LookUp(IReadOnlyDictionary<string, string?> emailById, string? userId) =>
        userId is not null && emailById.TryGetValue(userId, out var email) ? email : null;

    /// <summary>
    /// Chuẩn hoá email về chữ thường để so sánh nhất quán ở cả lúc tạo mã lẫn
    /// lúc dùng mã.
    /// </summary>
    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
}
