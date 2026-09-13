using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for system settings and system information (Admin only).
/// User administration lives in <see cref="UsersController"/>.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SystemManagementController : ControllerBase
{
    private readonly ISystemManagementService _systemManagementService;

    public SystemManagementController(ISystemManagementService systemManagementService)
    {
        _systemManagementService = systemManagementService;
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

        var setting = await _systemManagementService.CreateSettingAsync(createDto, userId);
        return CreatedAtAction(nameof(GetSettingByKey), new { key = setting.Key }, setting);
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

        var setting = await _systemManagementService.UpdateSettingAsync(key, updateDto, userId);
        return Ok(setting);
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
        var result = await _systemManagementService.DeleteSettingAsync(key);

        if (!result)
        {
            return NotFound(new { message = $"Setting with key '{key}' not found" });
        }

        return NoContent();
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

        var importedCount = await _systemManagementService.ImportSettingsAsync(jsonData, userId);
        return Ok(new { message = $"Successfully imported {importedCount} settings", count = importedCount });
    }
}
