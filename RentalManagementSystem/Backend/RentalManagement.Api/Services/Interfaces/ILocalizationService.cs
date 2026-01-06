using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for localization and translation management
/// </summary>
public interface ILocalizationService
{
    /// <summary>
    /// Get all active languages
    /// </summary>
    Task<IEnumerable<LanguageDto>> GetLanguagesAsync();

    /// <summary>
    /// Get all languages including inactive ones
    /// </summary>
    Task<IEnumerable<LanguageDto>> GetAllLanguagesAsync();

    /// <summary>
    /// Get language by code
    /// </summary>
    Task<LanguageDto?> GetLanguageByCodeAsync(string code);

    /// <summary>
    /// Get the default language
    /// </summary>
    Task<LanguageDto?> GetDefaultLanguageAsync();

    /// <summary>
    /// Create a new language
    /// </summary>
    Task<LanguageDto> CreateLanguageAsync(CreateLanguageDto createLanguageDto);

    /// <summary>
    /// Update an existing language
    /// </summary>
    Task<LanguageDto> UpdateLanguageAsync(string code, UpdateLanguageDto updateLanguageDto);

    /// <summary>
    /// Delete a language (soft delete by setting IsActive to false)
    /// </summary>
    Task<bool> DeleteLanguageAsync(string code);

    /// <summary>
    /// Set a language as the default language
    /// </summary>
    Task<LanguageDto> SetDefaultLanguageAsync(string code);

    /// <summary>
    /// Get all translations for a specific language
    /// </summary>
    Task<IEnumerable<TranslationDto>> GetTranslationsAsync(string languageCode);

    /// <summary>
    /// Get translations grouped by category for a specific language
    /// </summary>
    Task<TranslationResourceDto> GetTranslationResourcesAsync(string languageCode);

    /// <summary>
    /// Get a specific translation by key and language
    /// </summary>
    Task<string?> GetTranslationAsync(string languageCode, string key);

    /// <summary>
    /// Create or update a translation
    /// </summary>
    Task<TranslationDto> UpsertTranslationAsync(string languageCode, UpsertTranslationDto upsertTranslationDto);

    /// <summary>
    /// Bulk create or update translations
    /// </summary>
    Task BulkUpsertTranslationsAsync(BulkTranslationDto bulkTranslationDto);

    /// <summary>
    /// Delete a translation
    /// </summary>
    Task<bool> DeleteTranslationAsync(string languageCode, string key);

    /// <summary>
    /// Seed default translations for English and Vietnamese
    /// </summary>
    Task SeedDefaultTranslationsAsync();
}
