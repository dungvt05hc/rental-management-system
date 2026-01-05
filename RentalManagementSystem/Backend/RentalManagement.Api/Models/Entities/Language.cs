namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a supported language in the system
/// </summary>
public class Language
{
    /// <summary>
    /// Unique identifier for the language
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Language code (e.g., "en", "vi")
    /// </summary>
    public required string Code { get; set; }

    /// <summary>
    /// Language name in English (e.g., "English", "Vietnamese")
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Language name in native language (e.g., "English", "Tiếng Việt")
    /// </summary>
    public required string NativeName { get; set; }

    /// <summary>
    /// Indicates if this is the default language
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Indicates if this language is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Date when the language was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for translations
    /// </summary>
    public ICollection<Translation> Translations { get; set; } = new List<Translation>();
}
