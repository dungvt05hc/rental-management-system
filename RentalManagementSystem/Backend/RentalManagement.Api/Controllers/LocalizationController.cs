using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for managing languages and translations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LocalizationController : ControllerBase
{
    private readonly ILocalizationService _localizationService;
    private readonly ILogger<LocalizationController> _logger;

    public LocalizationController(
        ILocalizationService localizationService,
        ILogger<LocalizationController> logger)
    {
        _localizationService = localizationService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active languages
    /// </summary>
    [HttpGet("languages")]
    [ProducesResponseType(typeof(IEnumerable<LanguageDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LanguageDto>>> GetLanguages()
    {
        var languages = await _localizationService.GetLanguagesAsync();
        return Ok(languages);
    }

    /// <summary>
    /// Get all languages including inactive ones (Admin only)
    /// </summary>
    [HttpGet("languages/all")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<LanguageDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LanguageDto>>> GetAllLanguages()
    {
        var languages = await _localizationService.GetAllLanguagesAsync();
        return Ok(languages);
    }

    /// <summary>
    /// Get language by code
    /// </summary>
    [HttpGet("languages/{code}")]
    [ProducesResponseType(typeof(LanguageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LanguageDto>> GetLanguageByCode(string code)
    {
        var language = await _localizationService.GetLanguageByCodeAsync(code);
        
        if (language is null)
        {
            return NotFound(new { message = $"Language with code '{code}' not found" });
        }

        return Ok(language);
    }

    /// <summary>
    /// Get the default language
    /// </summary>
    [HttpGet("languages/default")]
    [ProducesResponseType(typeof(LanguageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LanguageDto>> GetDefaultLanguage()
    {
        var language = await _localizationService.GetDefaultLanguageAsync();
        
        if (language is null)
        {
            return NotFound(new { message = "No default language configured" });
        }

        return Ok(language);
    }

    /// <summary>
    /// Create a new language (Admin only)
    /// </summary>
    [HttpPost("languages")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(typeof(LanguageDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LanguageDto>> CreateLanguage([FromBody] CreateLanguageDto createLanguageDto)
    {
        try
        {
            var language = await _localizationService.CreateLanguageAsync(createLanguageDto);
            return CreatedAtAction(nameof(GetLanguageByCode), new { code = language.Code }, language);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing language
    /// </summary>
    [HttpPut("languages/{code}")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(typeof(LanguageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LanguageDto>> UpdateLanguage(
        string code,
        [FromBody] UpdateLanguageDto updateLanguageDto)
    {
        try
        {
            var language = await _localizationService.UpdateLanguageAsync(code, updateLanguageDto);
            return Ok(language);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a language (soft delete by setting IsActive to false)
    /// </summary>
    [HttpDelete("languages/{code}")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteLanguage(string code)
    {
        try
        {
            var result = await _localizationService.DeleteLanguageAsync(code);
            
            if (!result)
            {
                return NotFound(new { message = $"Language with code '{code}' not found" });
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Set a language as the default language
    /// </summary>
    [HttpPost("languages/{code}/set-default")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(typeof(LanguageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LanguageDto>> SetDefaultLanguage(string code)
    {
        try
        {
            var language = await _localizationService.SetDefaultLanguageAsync(code);
            return Ok(language);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all translations for a specific language
    /// </summary>
    [HttpGet("translations/{languageCode}")]
    [ProducesResponseType(typeof(IEnumerable<TranslationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<TranslationDto>>> GetTranslations(string languageCode)
    {
        try
        {
            var translations = await _localizationService.GetTranslationsAsync(languageCode);
            return Ok(translations);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get translations grouped by category for a specific language
    /// </summary>
    [HttpGet("translations/{languageCode}/resources")]
    [ProducesResponseType(typeof(TranslationResourceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TranslationResourceDto>> GetTranslationResources(string languageCode)
    {
        try
        {
            var resources = await _localizationService.GetTranslationResourcesAsync(languageCode);
            return Ok(resources);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific translation by key
    /// </summary>
    [HttpGet("translations/{languageCode}/{key}")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<string>> GetTranslation(string languageCode, string key)
    {
        var translation = await _localizationService.GetTranslationAsync(languageCode, key);
        
        if (translation is null)
        {
            return NotFound(new { message = $"Translation for key '{key}' not found in language '{languageCode}'" });
        }

        return Ok(new { key, value = translation });
    }

    /// <summary>
    /// Create or update a translation
    /// </summary>
    [HttpPut("translations/{languageCode}")]
    [Authorize(Policy = "Manager")]
    [ProducesResponseType(typeof(TranslationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TranslationDto>> UpsertTranslation(
        string languageCode,
        [FromBody] UpsertTranslationDto upsertTranslationDto)
    {
        try
        {
            var translation = await _localizationService.UpsertTranslationAsync(languageCode, upsertTranslationDto);
            return Ok(translation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bulk create or update translations
    /// </summary>
    [HttpPost("translations/bulk")]
    [Authorize(Policy = "Manager")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkUpsertTranslations([FromBody] BulkTranslationDto bulkTranslationDto)
    {
        try
        {
            await _localizationService.BulkUpsertTranslationsAsync(bulkTranslationDto);
            return Ok(new { message = $"Successfully upserted {bulkTranslationDto.Translations.Count} translations" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a translation
    /// </summary>
    [HttpDelete("translations/{languageCode}/{key}")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTranslation(string languageCode, string key)
    {
        var result = await _localizationService.DeleteTranslationAsync(languageCode, key);
        
        if (!result)
        {
            return NotFound(new { message = $"Translation for key '{key}' not found in language '{languageCode}'" });
        }

        return NoContent();
    }

    /// <summary>
    /// Seed default translations (Admin only)
    /// </summary>
    [HttpPost("seed")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedDefaultTranslations()
    {
        await _localizationService.SeedDefaultTranslationsAsync();
        return Ok(new { message = "Default translations seeded successfully" });
    }
}
