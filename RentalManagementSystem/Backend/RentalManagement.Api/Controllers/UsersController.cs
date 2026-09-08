using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for user administration: CRUD, roles, activation and password reset (Admin only)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public UsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    /// <summary>
    /// Get paginated and filtered list of users
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PaginatedUsersDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PaginatedUsersDto>>> GetUsers([FromQuery] UserFilterDto filter)
    {
        var result = await _userManagementService.GetUsersAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Get user by ID with detailed information
    /// </summary>
    [HttpGet("{userId}")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetUserById(string userId)
    {
        var result = await _userManagementService.GetUserByIdAsync(userId);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new user
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateUser([FromBody] CreateUserDto createDto)
    {
        var userId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.CreateUserAsync(createDto, userId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetUserById), new { userId = result.Data!.Id }, result);
    }

    /// <summary>
    /// Update user information
    /// </summary>
    [HttpPut("{userId}")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser(string userId, [FromBody] UpdateUserProfileDto updateDto)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.UpdateUserAsync(userId, updateDto, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Delete a user
    /// </summary>
    [HttpDelete("{userId}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(string userId)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.DeleteUserAsync(userId, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Activate or deactivate a user account
    /// </summary>
    [HttpPatch("{userId}/activation")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> SetUserActivation(string userId, [FromBody] UserActivationDto activationDto)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.SetUserActivationAsync(userId, activationDto, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Reset user password (Admin only)
    /// </summary>
    [HttpPost("{userId}/reset-password")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> ResetUserPassword(string userId, [FromBody] ResetUserPasswordDto resetDto)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.ResetUserPasswordAsync(userId, resetDto, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Assign roles to a user
    /// </summary>
    [HttpPost("{userId}/roles")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> AssignRoles(string userId, [FromBody] List<string> roles)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.AssignRolesAsync(userId, roles, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Remove roles from a user
    /// </summary>
    [HttpDelete("{userId}/roles")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveRoles(string userId, [FromBody] List<string> roles)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.RemoveRolesAsync(userId, roles, currentUserId);

        if (!result.Success)
        {
            return result.Message.Contains("not found") ? NotFound(result) : BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get all available roles
    /// </summary>
    [HttpGet("roles/available")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<RoleDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IEnumerable<RoleDto>>>> GetAvailableRoles()
    {
        var result = await _userManagementService.GetAvailableRolesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Get user statistics
    /// </summary>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(ApiResponse<UserStatisticsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<UserStatisticsDto>>> GetUserStatistics()
    {
        var result = await _userManagementService.GetUserStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Perform bulk operations on users
    /// </summary>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<int>>> BulkUserOperation([FromBody] BulkUserOperationDto bulkOperation)
    {
        var currentUserId = User.FindFirst("id")?.Value ?? "Unknown";
        var result = await _userManagementService.BulkUserOperationAsync(bulkOperation, currentUserId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Get user audit log
    /// </summary>
    [HttpGet("{userId}/audit-log")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<string>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetUserAuditLog(string userId, [FromQuery] int limit = 50)
    {
        var result = await _userManagementService.GetUserAuditLogAsync(userId, limit);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
