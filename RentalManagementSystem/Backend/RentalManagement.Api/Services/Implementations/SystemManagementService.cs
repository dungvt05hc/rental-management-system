using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;
using System.Text.Json;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Service for managing system settings and configuration
/// </summary>
public class SystemManagementService : ISystemManagementService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<SystemManagementService> _logger;
    private readonly IConfiguration _configuration;

    public SystemManagementService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<SystemManagementService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync()
    {
        var settings = await _context.SystemSettings
            .Where(s => s.IsVisible)
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Key)
            .ToListAsync();

        return _mapper.Map<IEnumerable<SystemSettingDto>>(settings);
    }

    public async Task<IEnumerable<SystemSettingsByCategoryDto>> GetSettingsByCategoryAsync()
    {
        var settings = await _context.SystemSettings
            .Where(s => s.IsVisible)
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Key)
            .ToListAsync();

        var grouped = settings
            .GroupBy(s => s.Category)
            .Select(g => new SystemSettingsByCategoryDto
            {
                Category = g.Key,
                Settings = _mapper.Map<List<SystemSettingDto>>(g.ToList())
            })
            .ToList();

        return grouped;
    }

    public async Task<SystemSettingDto?> GetSettingByKeyAsync(string key)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        return setting is not null ? _mapper.Map<SystemSettingDto>(setting) : null;
    }

    public async Task<IEnumerable<SystemSettingDto>> GetSettingsByCategoryNameAsync(string category)
    {
        var settings = await _context.SystemSettings
            .Where(s => s.Category == category && s.IsVisible)
            .OrderBy(s => s.Key)
            .ToListAsync();

        return _mapper.Map<IEnumerable<SystemSettingDto>>(settings);
    }

    public async Task<SystemSettingDto> CreateSettingAsync(CreateSystemSettingDto createDto, string modifiedBy)
    {
        // Check if key already exists
        var existingSetting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == createDto.Key);

        if (existingSetting is not null)
        {
            throw new InvalidOperationException($"Setting with key '{createDto.Key}' already exists");
        }

        var setting = _mapper.Map<SystemSetting>(createDto);
        setting.ModifiedBy = modifiedBy;
        setting.CreatedAt = DateTime.UtcNow;
        setting.UpdatedAt = DateTime.UtcNow;

        _context.SystemSettings.Add(setting);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created system setting: {Key} by {User}", setting.Key, modifiedBy);

        return _mapper.Map<SystemSettingDto>(setting);
    }

    public async Task<SystemSettingDto> UpdateSettingAsync(string key, UpdateSystemSettingDto updateDto, string modifiedBy)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting is null)
        {
            throw new InvalidOperationException($"Setting with key '{key}' not found");
        }

        if (!setting.IsEditable)
        {
            throw new InvalidOperationException($"Setting '{key}' is not editable");
        }

        setting.Value = updateDto.Value;
        if (updateDto.Description is not null)
        {
            setting.Description = updateDto.Description;
        }
        setting.ModifiedBy = modifiedBy;
        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated system setting: {Key} by {User}", key, modifiedBy);

        return _mapper.Map<SystemSettingDto>(setting);
    }

    public async Task<int> BulkUpdateSettingsAsync(BulkUpdateSettingsDto bulkUpdateDto, string modifiedBy)
    {
        var keys = bulkUpdateDto.Settings.Select(s => s.Key).ToList();
        var settings = await _context.SystemSettings
            .Where(s => keys.Contains(s.Key) && s.IsEditable)
            .ToListAsync();

        var updatedCount = 0;

        foreach (var updateItem in bulkUpdateDto.Settings)
        {
            var setting = settings.FirstOrDefault(s => s.Key == updateItem.Key);
            if (setting is not null)
            {
                setting.Value = updateItem.Value;
                setting.ModifiedBy = modifiedBy;
                setting.UpdatedAt = DateTime.UtcNow;
                updatedCount++;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bulk updated {Count} system settings by {User}", updatedCount, modifiedBy);

        return updatedCount;
    }

    public async Task<bool> DeleteSettingAsync(string key)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting is null)
        {
            return false;
        }

        if (!setting.IsEditable)
        {
            throw new InvalidOperationException($"Setting '{key}' cannot be deleted");
        }

        _context.SystemSettings.Remove(setting);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted system setting: {Key}", key);

        return true;
    }

    public async Task<SystemInfoDto> GetSystemInfoAsync()
    {
        var defaultLanguage = await _context.Languages
            .Where(l => l.IsDefault)
            .Select(l => l.Code)
            .FirstOrDefaultAsync() ?? "en";

        var totalLanguages = await _context.Languages.CountAsync();
        var totalUsers = await _context.Users.CountAsync();
        var totalRooms = await _context.Rooms.CountAsync();
        var totalTenants = await _context.Tenants.CountAsync();
        var activeTenants = await _context.Tenants
            .Where(t => t.IsActive && t.RoomId != null)
            .CountAsync();

        var databaseInfo = new Dictionary<string, string>
        {
            { "Provider", _context.Database.ProviderName ?? "Unknown" },
            { "ConnectionName", "DefaultConnection" },
            { "CanConnect", _context.Database.CanConnect().ToString() }
        };

        return new SystemInfoDto
        {
            Version = "1.0.0",
            Environment = _configuration["ASPNETCORE_ENVIRONMENT"] ?? "Development",
            ServerTime = DateTime.UtcNow,
            DefaultLanguage = defaultLanguage,
            TotalLanguages = totalLanguages,
            TotalUsers = totalUsers,
            TotalRooms = totalRooms,
            TotalTenants = totalTenants,
            ActiveTenants = activeTenants,
            DatabaseInfo = databaseInfo
        };
    }

    public async Task SeedDefaultSettingsAsync()
    {
        var existingSettings = await _context.SystemSettings.ToListAsync();
        
        var defaultSettings = new List<SystemSetting>
        {
            // General Settings
            new SystemSetting
            {
                Key = "system.name",
                Value = "Rental Management System",
                Category = "General",
                DataType = "string",
                Description = "Name of the application",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "system.timezone",
                Value = "UTC",
                Category = "General",
                DataType = "string",
                Description = "Default system timezone",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "system.dateFormat",
                Value = "MM/dd/yyyy",
                Category = "General",
                DataType = "string",
                Description = "Date format used throughout the system",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "system.currency",
                Value = "USD",
                Category = "General",
                DataType = "string",
                Description = "Default currency code",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "system.currencySymbol",
                Value = "$",
                Category = "General",
                DataType = "string",
                Description = "Currency symbol to display",
                IsEditable = true,
                IsVisible = true
            },

            // Notification Settings
            new SystemSetting
            {
                Key = "notification.emailEnabled",
                Value = "false",
                Category = "Notification",
                DataType = "boolean",
                Description = "Enable email notifications",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "notification.smsEnabled",
                Value = "false",
                Category = "Notification",
                DataType = "boolean",
                Description = "Enable SMS notifications",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "notification.invoiceReminderDays",
                Value = "7",
                Category = "Notification",
                DataType = "number",
                Description = "Days before due date to send invoice reminders",
                IsEditable = true,
                IsVisible = true
            },

            // Payment Settings
            new SystemSetting
            {
                Key = "payment.lateFeeEnabled",
                Value = "true",
                Category = "Payment",
                DataType = "boolean",
                Description = "Enable late payment fees",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "payment.lateFeePercentage",
                Value = "5",
                Category = "Payment",
                DataType = "number",
                Description = "Late fee percentage of total amount",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "payment.gracePeriodDays",
                Value = "3",
                Category = "Payment",
                DataType = "number",
                Description = "Grace period days before late fees apply",
                IsEditable = true,
                IsVisible = true
            },

            // Display Settings
            new SystemSetting
            {
                Key = "display.itemsPerPage",
                Value = "10",
                Category = "Display",
                DataType = "number",
                Description = "Number of items to display per page",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "display.theme",
                Value = "light",
                Category = "Display",
                DataType = "string",
                Description = "Default application theme (light/dark)",
                IsEditable = true,
                IsVisible = true
            },

            // Security Settings
            new SystemSetting
            {
                Key = "security.sessionTimeout",
                Value = "30",
                Category = "Security",
                DataType = "number",
                Description = "Session timeout in minutes",
                IsEditable = true,
                IsVisible = true
            },
            new SystemSetting
            {
                Key = "security.passwordExpiryDays",
                Value = "90",
                Category = "Security",
                DataType = "number",
                Description = "Number of days before password expires",
                IsEditable = true,
                IsVisible = true
            }
        };

        foreach (var defaultSetting in defaultSettings)
        {
            if (!existingSettings.Any(s => s.Key == defaultSetting.Key))
            {
                defaultSetting.CreatedAt = DateTime.UtcNow;
                defaultSetting.UpdatedAt = DateTime.UtcNow;
                _context.SystemSettings.Add(defaultSetting);
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded default system settings");
    }

    public async Task<string> ExportSettingsAsync()
    {
        var settings = await _context.SystemSettings
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Key)
            .ToListAsync();

        var settingDtos = _mapper.Map<List<SystemSettingDto>>(settings);
        
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        return JsonSerializer.Serialize(settingDtos, options);
    }

    public async Task<int> ImportSettingsAsync(string jsonData, string modifiedBy)
    {
        var settings = JsonSerializer.Deserialize<List<SystemSettingDto>>(jsonData, 
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        if (settings is null || settings.Count == 0)
        {
            throw new InvalidOperationException("Invalid or empty settings data");
        }

        var importedCount = 0;

        foreach (var settingDto in settings)
        {
            var existingSetting = await _context.SystemSettings
                .FirstOrDefaultAsync(s => s.Key == settingDto.Key);

            if (existingSetting is not null)
            {
                if (existingSetting.IsEditable)
                {
                    existingSetting.Value = settingDto.Value;
                    existingSetting.Description = settingDto.Description;
                    existingSetting.ModifiedBy = modifiedBy;
                    existingSetting.UpdatedAt = DateTime.UtcNow;
                    importedCount++;
                }
            }
            else
            {
                var newSetting = new SystemSetting
                {
                    Key = settingDto.Key,
                    Value = settingDto.Value,
                    Category = settingDto.Category,
                    DataType = settingDto.DataType,
                    Description = settingDto.Description,
                    IsEditable = settingDto.IsEditable,
                    IsVisible = settingDto.IsVisible,
                    ModifiedBy = modifiedBy,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SystemSettings.Add(newSetting);
                importedCount++;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Imported {Count} system settings by {User}", importedCount, modifiedBy);

        return importedCount;
    }
}
