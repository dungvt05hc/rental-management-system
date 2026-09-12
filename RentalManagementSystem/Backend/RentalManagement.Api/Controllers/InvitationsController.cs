using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for invitation codes: issuing, listing and revoking them (Admin only)
/// </summary>
/// <remarks>
/// Mã mời quyết định role của tài khoản sinh ra từ nó, nên phát mã tương đương
/// với quyền tạo người dùng — vì vậy toàn bộ controller này chỉ Admin dùng được.
/// </remarks>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;

    public InvitationsController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    /// <summary>
    /// Lists every invitation, newest first
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<InvitationDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<InvitationDto>>>> GetInvitations(
        CancellationToken ct)
    {
        return Ok(await _invitationService.GetAllAsync(ct));
    }

    /// <summary>
    /// Issues a new invitation code
    /// </summary>
    /// <remarks>
    /// Mã đầy đủ chỉ có trong response này. Database chỉ giữ bản băm, nên mã
    /// không lấy lại được — mất thì thu hồi và phát mã mới.
    /// </remarks>
    /// <param name="request">Role, expiry and optional email binding</param>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CreatedInvitationDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<CreatedInvitationDto>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<CreatedInvitationDto>>> CreateInvitation(
        [FromBody] CreateInvitationDto request,
        CancellationToken ct)
    {
        var result = await _invitationService.CreateAsync(request, CurrentUserId, ct);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Revokes an invitation that has not been used yet
    /// </summary>
    /// <param name="id">Invitation id</param>
    [HttpPost("{id:guid}/revoke")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeInvitation(Guid id, CancellationToken ct)
    {
        var result = await _invitationService.RevokeAsync(id, CurrentUserId, ct);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Id của Admin đang gọi, lấy từ claim mà AuthService.GenerateJwtTokenAsync ghi vào token.
    /// </summary>
    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
}
