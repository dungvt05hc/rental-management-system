namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for system setting
/// </summary>
public class SystemSettingDto
{
    public int Id { get; set; }
    public required string Key { get; set; }
    public required string Value { get; set; }
    public required string Category { get; set; }
    public required string DataType { get; set; }
    public string? Description { get; set; }
    public bool IsEditable { get; set; }
    public bool IsVisible { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ModifiedBy { get; set; }
}

/// <summary>
/// DTO for creating a system setting
/// </summary>
public class CreateSystemSettingDto
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public required string Category { get; set; }
    public required string DataType { get; set; }
    public string? Description { get; set; }
    public bool IsEditable { get; set; } = true;
    public bool IsVisible { get; set; } = true;
}

/// <summary>
/// DTO for updating a system setting
/// </summary>
public class UpdateSystemSettingDto
{
    public required string Value { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// DTO for bulk updating system settings
/// </summary>
public class BulkUpdateSettingsDto
{
    public required List<UpdateSettingItemDto> Settings { get; set; }
}

/// <summary>
/// Individual setting item for bulk update
/// </summary>
public class UpdateSettingItemDto
{
    public required string Key { get; set; }
    public required string Value { get; set; }
}

/// <summary>
/// DTO for grouped system settings by category
/// </summary>
public class SystemSettingsByCategoryDto
{
    public required string Category { get; set; }
    public required List<SystemSettingDto> Settings { get; set; }
}

/// <summary>
/// DTO for system information and statistics
/// </summary>
public class SystemInfoDto
{
    public required string Version { get; set; }
    public required string Environment { get; set; }
    public DateTime ServerTime { get; set; }
    public required string DefaultLanguage { get; set; }
    public int TotalLanguages { get; set; }
    public int TotalUsers { get; set; }
    public int TotalRooms { get; set; }
    public int TotalTenants { get; set; }
    public int ActiveTenants { get; set; }
    public required Dictionary<string, string> DatabaseInfo { get; set; }
}
