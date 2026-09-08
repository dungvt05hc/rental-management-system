using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for system management and configuration (Admin only)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SystemManagementController : ControllerBase
{
    private readonly ISystemManagementService _systemManagementService;
    private readonly IUserManagementService _userManagementService;

    public SystemManagementController(
        ISystemManagementService systemManagementService,
        IUserManagementService userManagementService)
    {
        _systemManagementService = systemManagementService;
        _userManagementService = userManagementService;
    }

    /// <summary>
    /// Get system information and statistics
    /// </summary>
    [HttpGet("info")]
    [ProducesResponseType(typeof(SystemInfoDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemInfoDto>> GetSystemInfo()
    {
        var systemInfo = await _systemManagementService.GetSystemInfoAsync();
        return Ok(systemInfo);
    }

    /// <summary>
    /// Get all system settings
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingDto>>> GetAllSettings()
    {
        var settings = await _systemManagementService.GetAllSettingsAsync();
        return Ok(settings);
    }

    /// <summary>
    /// Get system settings grouped by category
    /// </summary>
    [HttpGet("settings/by-category")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingsByCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingsByCategoryDto>>> GetSettingsByCategory()
    {
        var settings = await _systemManagementService.GetSettingsByCategoryAsync();
        return Ok(settings);
    }

    /// <summary>
    /// Get a specific setting by key
    /// </summary>
    [HttpGet("settings/{key}")]
    [ProducesResponseType(typeof(SystemSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> GetSettingByKey(string key)
    {
        var setting = await _systemManagementService.GetSettingByKeyAsync(key);

        if (setting is null)
        {
            return NotFound(new { message = $"Setting with key '{key}' not found" });
        }

        return Ok(setting);
    }

    /// <summary>
    /// Get settings by category name
    /// </summary>
    [HttpGet("settings/category/{category}")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingDto>>> GetSettingsByCategoryName(string category)
    {
        var settings = await _systemManagementService.GetSettingsByCategoryNameAsync(category);
        return Ok(settings);
    }

    /// <summary>
    /// Create a new system setting
    /// </summary>
    [HttpPost("settings")]
    [ProducesResponseType(typeof(SystemSettingDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SystemSettingDto>> CreateSetting([FromBody] CreateSystemSettingDto createDto)
    {
        var userId = User.FindFirst("id")?.Value ?? "Unknown";

        try
        {
            var setting = await _systemManagementService.CreateSettingAsync(createDto, userId);
            return CreatedAtAction(nameof(GetSettingByKey), new { key = setting.Key }, setting);
        }
        catch (InvalidOperationException ex)
        {
            // Domain rule violation (duplicate key, read-only setting, …) — the service
            // message is written for the caller, so it is safe to surface.
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing system setting
    /// </summary>
    [HttpPut("settings/{key}")]
    [ProducesResponseType(typeof(SystemSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> UpdateSetting(string key, [FromBody] UpdateSystemSettingDto updateDto)
    {
        var userId = User.FindFirst("id")?.Value ?? "Unknown";

        try
        {
            var setting = await _systemManagementService.UpdateSettingAsync(key, updateDto, userId);
            return Ok(setting);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bulk update multiple settings
    /// </summary>
    [HttpPut("settings/bulk")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkUpdateSettings([FromBody] BulkUpdateSettingsDto bulkUpdateDto)
    {
        var userId = User.FindFirst("id")?.Value ?? "Unknown";
        var updatedCount = await _systemManagementService.BulkUpdateSettingsAsync(bulkUpdateDto, userId);

        return Ok(new { message = $"Successfully updated {updatedCount} settings", count = updatedCount });
    }

    /// <summary>
    /// Delete a system setting
    /// </summary>
    [HttpDelete("settings/{key}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSetting(string key)
    {
        try
        {
            var result = await _systemManagementService.DeleteSettingAsync(key);

            if (!result)
            {
                return NotFound(new { message = $"Setting with key '{key}' not found" });
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Seed default system settings
    /// </summary>
    [HttpPost("settings/seed")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedDefaultSettings()
    {
        await _systemManagementService.SeedDefaultSettingsAsync();
        return Ok(new { message = "Default system settings seeded successfully" });
    }

    /// <summary>
    /// Export system settings to JSON
    /// </summary>
    [HttpGet("settings/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSettings()
    {
        var json = await _systemManagementService.ExportSettingsAsync();
        return File(
            System.Text.Encoding.UTF8.GetBytes(json),
            "application/json",
            $"system-settings-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json"
        );
    }

    /// <summary>
    /// Import system settings from JSON
    /// </summary>
    [HttpPost("settings/import")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportSettings([FromBody] string jsonData)
    {
        var userId = User.FindFirst("id")?.Value ?? "Unknown";

        try
        {
            var importedCount = await _systemManagementService.ImportSettingsAsync(jsonData, userId);
            return Ok(new { message = $"Successfully imported {importedCount} settings", count = importedCount });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    #region User Management

    /// <summary>
    /// Get paginated and filtered list of users
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedUsersDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PaginatedUsersDto>>> GetUsers([FromQuery] UserFilterDto filter)
    {
        var result = await _userManagementService.GetUsersAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Get user by ID with detailed information
    /// </summary>
    [HttpGet("users/{userId}")]
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
    [HttpPost("users")]
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
    [HttpPut("users/{userId}")]
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
    [HttpDelete("users/{userId}")]
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
    [HttpPatch("users/{userId}/activation")]
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
    [HttpPost("users/{userId}/reset-password")]
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
    [HttpPost("users/{userId}/roles")]
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
    [HttpDelete("users/{userId}/roles")]
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
    [HttpGet("users/roles/available")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<RoleDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IEnumerable<RoleDto>>>> GetAvailableRoles()
    {
        var result = await _userManagementService.GetAvailableRolesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Get user statistics
    /// </summary>
    [HttpGet("users/statistics")]
    [ProducesResponseType(typeof(ApiResponse<UserStatisticsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<UserStatisticsDto>>> GetUserStatistics()
    {
        var result = await _userManagementService.GetUserStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Perform bulk operations on users
    /// </summary>
    [HttpPost("users/bulk")]
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
    [HttpGet("users/{userId}/audit-log")]
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

    #endregion
}
