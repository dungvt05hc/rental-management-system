namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for language information
/// </summary>
public class LanguageDto
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public required string NativeName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO for creating a new language
/// </summary>
public class CreateLanguageDto
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public required string NativeName { get; set; }
    public bool IsDefault { get; set; }
}

/// <summary>
/// DTO for updating an existing language
/// </summary>
public class UpdateLanguageDto
{
    public required string Name { get; set; }
    public required string NativeName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO for translation information
/// </summary>
public class TranslationDto
{
    public int Id { get; set; }
    public required string Key { get; set; }
    public required string Value { get; set; }
    public string Category { get; set; } = "common";
    public string? Description { get; set; }
}

/// <summary>
/// DTO for creating or updating a translation
/// </summary>
public class UpsertTranslationDto
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public string Category { get; set; } = "common";
    public string? Description { get; set; }
}

/// <summary>
/// DTO for bulk translation operations
/// </summary>
public class BulkTranslationDto
{
    public required string LanguageCode { get; set; }
    public required Dictionary<string, string> Translations { get; set; }
}

/// <summary>
/// DTO for returning translations grouped by category
/// </summary>
public class TranslationResourceDto
{
    public required string LanguageCode { get; set; }
    public required Dictionary<string, Dictionary<string, string>> Resources { get; set; }
}
