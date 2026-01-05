namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a configurable system setting
/// </summary>
public class SystemSetting
{
    /// <summary>
    /// Unique identifier for the setting
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Setting key (unique identifier for the setting)
    /// </summary>
    public required string Key { get; set; }

    /// <summary>
    /// Setting value
    /// </summary>
    public required string Value { get; set; }

    /// <summary>
    /// Setting category (e.g., "General", "Notification", "Payment", "Display")
    /// </summary>
    public required string Category { get; set; }

    /// <summary>
    /// Data type of the value (e.g., "string", "number", "boolean", "json")
    /// </summary>
    public required string DataType { get; set; }

    /// <summary>
    /// Human-readable description of the setting
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this setting is editable by users
    /// </summary>
    public bool IsEditable { get; set; } = true;

    /// <summary>
    /// Whether this setting is visible to users
    /// </summary>
    public bool IsVisible { get; set; } = true;

    /// <summary>
    /// Date when the setting was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date when the setting was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// User who last modified the setting
    /// </summary>
    public string? ModifiedBy { get; set; }
}
