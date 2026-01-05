namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a translation for a specific key in a specific language
/// </summary>
public class Translation
{
    /// <summary>
    /// Unique identifier for the translation
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Translation key (e.g., "common.save", "auth.login")
    /// </summary>
    public required string Key { get; set; }

    /// <summary>
    /// Translation value in the target language
    /// </summary>
    public required string Value { get; set; }

    /// <summary>
    /// Language ID
    /// </summary>
    public int LanguageId { get; set; }

    /// <summary>
    /// Navigation property to the language
    /// </summary>
    public Language? Language { get; set; }

    /// <summary>
    /// Category for organizing translations (e.g., "common", "auth", "rooms")
    /// </summary>
    public string Category { get; set; } = "common";

    /// <summary>
    /// Optional description or context for translators
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Date when the translation was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date when the translation was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
