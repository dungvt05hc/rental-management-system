using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Interface for system management operations
/// </summary>
public interface ISystemManagementService
{
    /// <summary>
    /// Get all system settings
    /// </summary>
    Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync();

    /// <summary>
    /// Get system settings grouped by category
    /// </summary>
    Task<IEnumerable<SystemSettingsByCategoryDto>> GetSettingsByCategoryAsync();

    /// <summary>
    /// Get a specific setting by key
    /// </summary>
    Task<SystemSettingDto?> GetSettingByKeyAsync(string key);

    /// <summary>
    /// Get settings by category
    /// </summary>
    Task<IEnumerable<SystemSettingDto>> GetSettingsByCategoryNameAsync(string category);

    /// <summary>
    /// Create a new system setting
    /// </summary>
    Task<SystemSettingDto> CreateSettingAsync(CreateSystemSettingDto createDto, string modifiedBy);

    /// <summary>
    /// Update an existing system setting
    /// </summary>
    Task<SystemSettingDto> UpdateSettingAsync(string key, UpdateSystemSettingDto updateDto, string modifiedBy);

    /// <summary>
    /// Bulk update multiple settings
    /// </summary>
    Task<int> BulkUpdateSettingsAsync(BulkUpdateSettingsDto bulkUpdateDto, string modifiedBy);

    /// <summary>
    /// Delete a system setting
    /// </summary>
    Task<bool> DeleteSettingAsync(string key);

    /// <summary>
    /// Get system information and statistics
    /// </summary>
    Task<SystemInfoDto> GetSystemInfoAsync();

    /// <summary>
    /// Seed default system settings
    /// </summary>
    Task SeedDefaultSettingsAsync();

    /// <summary>
    /// Export system settings to JSON
    /// </summary>
    Task<string> ExportSettingsAsync();

    /// <summary>
    /// Import system settings from JSON
    /// </summary>
    Task<int> ImportSettingsAsync(string jsonData, string modifiedBy);
}
