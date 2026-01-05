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
    private readonly ILogger<SystemManagementController> _logger;

    public SystemManagementController(
        ISystemManagementService systemManagementService,
        ILogger<SystemManagementController> logger)
    {
        _systemManagementService = systemManagementService;
        _logger = logger;
    }

    /// <summary>
    /// Get system information and statistics
    /// </summary>
    [HttpGet("info")]
    [ProducesResponseType(typeof(SystemInfoDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemInfoDto>> GetSystemInfo()
    {
        try
        {
            var systemInfo = await _systemManagementService.GetSystemInfoAsync();
            return Ok(systemInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system information");
            return StatusCode(500, new { message = "An error occurred while retrieving system information" });
        }
    }

    /// <summary>
    /// Get all system settings
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingDto>>> GetAllSettings()
    {
        try
        {
            var settings = await _systemManagementService.GetAllSettingsAsync();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system settings");
            return StatusCode(500, new { message = "An error occurred while retrieving settings" });
        }
    }

    /// <summary>
    /// Get system settings grouped by category
    /// </summary>
    [HttpGet("settings/by-category")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingsByCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingsByCategoryDto>>> GetSettingsByCategory()
    {
        try
        {
            var settings = await _systemManagementService.GetSettingsByCategoryAsync();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving settings by category");
            return StatusCode(500, new { message = "An error occurred while retrieving settings" });
        }
    }

    /// <summary>
    /// Get a specific setting by key
    /// </summary>
    [HttpGet("settings/{key}")]
    [ProducesResponseType(typeof(SystemSettingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> GetSettingByKey(string key)
    {
        try
        {
            var setting = await _systemManagementService.GetSettingByKeyAsync(key);
            
            if (setting is null)
            {
                return NotFound(new { message = $"Setting with key '{key}' not found" });
            }

            return Ok(setting);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving setting {Key}", key);
            return StatusCode(500, new { message = "An error occurred while retrieving the setting" });
        }
    }

    /// <summary>
    /// Get settings by category name
    /// </summary>
    [HttpGet("settings/category/{category}")]
    [ProducesResponseType(typeof(IEnumerable<SystemSettingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SystemSettingDto>>> GetSettingsByCategoryName(string category)
    {
        try
        {
            var settings = await _systemManagementService.GetSettingsByCategoryNameAsync(category);
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving settings for category {Category}", category);
            return StatusCode(500, new { message = "An error occurred while retrieving settings" });
        }
    }

    /// <summary>
    /// Create a new system setting
    /// </summary>
    [HttpPost("settings")]
    [ProducesResponseType(typeof(SystemSettingDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SystemSettingDto>> CreateSetting([FromBody] CreateSystemSettingDto createDto)
    {
        try
        {
            var userId = User.FindFirst("id")?.Value ?? "Unknown";
            var setting = await _systemManagementService.CreateSettingAsync(createDto, userId);
            
            return CreatedAtAction(nameof(GetSettingByKey), new { key = setting.Key }, setting);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating system setting");
            return StatusCode(500, new { message = "An error occurred while creating the setting" });
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
        try
        {
            var userId = User.FindFirst("id")?.Value ?? "Unknown";
            var setting = await _systemManagementService.UpdateSettingAsync(key, updateDto, userId);
            
            return Ok(setting);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating system setting {Key}", key);
            return StatusCode(500, new { message = "An error occurred while updating the setting" });
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
        try
        {
            var userId = User.FindFirst("id")?.Value ?? "Unknown";
            var updatedCount = await _systemManagementService.BulkUpdateSettingsAsync(bulkUpdateDto, userId);
            
            return Ok(new { message = $"Successfully updated {updatedCount} settings", count = updatedCount });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk updating system settings");
            return StatusCode(500, new { message = "An error occurred while updating settings" });
        }
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting system setting {Key}", key);
            return StatusCode(500, new { message = "An error occurred while deleting the setting" });
        }
    }

    /// <summary>
    /// Seed default system settings
    /// </summary>
    [HttpPost("settings/seed")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedDefaultSettings()
    {
        try
        {
            await _systemManagementService.SeedDefaultSettingsAsync();
            return Ok(new { message = "Default system settings seeded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding default settings");
            return StatusCode(500, new { message = "An error occurred while seeding settings" });
        }
    }

    /// <summary>
    /// Export system settings to JSON
    /// </summary>
    [HttpGet("settings/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSettings()
    {
        try
        {
            var json = await _systemManagementService.ExportSettingsAsync();
            return File(
                System.Text.Encoding.UTF8.GetBytes(json),
                "application/json",
                $"system-settings-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting system settings");
            return StatusCode(500, new { message = "An error occurred while exporting settings" });
        }
    }

    /// <summary>
    /// Import system settings from JSON
    /// </summary>
    [HttpPost("settings/import")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportSettings([FromBody] string jsonData)
    {
        try
        {
            var userId = User.FindFirst("id")?.Value ?? "Unknown";
            var importedCount = await _systemManagementService.ImportSettingsAsync(jsonData, userId);
            
            return Ok(new { message = $"Successfully imported {importedCount} settings", count = importedCount });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing system settings");
            return StatusCode(500, new { message = "An error occurred while importing settings" });
        }
    }
}
