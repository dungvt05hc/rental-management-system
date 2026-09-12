using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Service implementation for localization and translation management
/// </summary>
public class LocalizationService : ILocalizationService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<LocalizationService> _logger;

    public LocalizationService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<LocalizationService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IEnumerable<LanguageDto>> GetLanguagesAsync()
    {
        var languages = await _context.Languages
            .Where(l => l.IsActive)
            .OrderBy(l => l.Name)
            .ToListAsync();

        return _mapper.Map<IEnumerable<LanguageDto>>(languages);
    }

    public async Task<IEnumerable<LanguageDto>> GetAllLanguagesAsync()
    {
        var languages = await _context.Languages
            .OrderBy(l => l.Name)
            .ToListAsync();

        return _mapper.Map<IEnumerable<LanguageDto>>(languages);
    }

    public async Task<LanguageDto?> GetLanguageByCodeAsync(string code)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == code && l.IsActive);

        return language is not null ? _mapper.Map<LanguageDto>(language) : null;
    }

    public async Task<LanguageDto?> GetDefaultLanguageAsync()
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.IsDefault && l.IsActive);

        return language is not null ? _mapper.Map<LanguageDto>(language) : null;
    }

    public async Task<LanguageDto> CreateLanguageAsync(CreateLanguageDto createLanguageDto)
    {
        // Check if language code already exists
        if (await _context.Languages.AnyAsync(l => l.Code == createLanguageDto.Code))
        {
            throw new InvalidOperationException($"Language with code '{createLanguageDto.Code}' already exists");
        }

        // If this is the first language or set as default, ensure it's the only default
        if (createLanguageDto.IsDefault)
        {
            var existingDefault = await _context.Languages.FirstOrDefaultAsync(l => l.IsDefault);
            if (existingDefault is not null)
            {
                existingDefault.IsDefault = false;
            }
        }

        var language = _mapper.Map<Language>(createLanguageDto);
        language.CreatedAt = DateTime.UtcNow;

        _context.Languages.Add(language);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created language: {Code} - {Name}", language.Code, language.Name);

        return _mapper.Map<LanguageDto>(language);
    }

    public async Task<LanguageDto> UpdateLanguageAsync(string code, UpdateLanguageDto updateLanguageDto)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == code);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{code}' not found");
        }

        // If setting as default, unset other defaults
        if (updateLanguageDto.IsDefault && !language.IsDefault)
        {
            var existingDefault = await _context.Languages
                .FirstOrDefaultAsync(l => l.IsDefault && l.Id != language.Id);
            
            if (existingDefault is not null)
            {
                existingDefault.IsDefault = false;
            }
        }

        language.Name = updateLanguageDto.Name;
        language.NativeName = updateLanguageDto.NativeName;
        language.IsDefault = updateLanguageDto.IsDefault;
        language.IsActive = updateLanguageDto.IsActive;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated language: {Code} - {Name}", language.Code, language.Name);

        return _mapper.Map<LanguageDto>(language);
    }

    public async Task<bool> DeleteLanguageAsync(string code)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == code);

        if (language is null)
        {
            return false;
        }

        // Prevent deleting the default language
        if (language.IsDefault)
        {
            throw new InvalidOperationException("Cannot delete the default language. Please set another language as default first.");
        }

        // Soft delete by setting IsActive to false
        language.IsActive = false;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted (soft) language: {Code} - {Name}", language.Code, language.Name);

        return true;
    }

    public async Task<LanguageDto> SetDefaultLanguageAsync(string code)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == code && l.IsActive);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{code}' not found or inactive");
        }

        // Unset current default
        var currentDefault = await _context.Languages
            .FirstOrDefaultAsync(l => l.IsDefault && l.Id != language.Id);
        
        if (currentDefault is not null)
        {
            currentDefault.IsDefault = false;
        }

        language.IsDefault = true;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Set default language: {Code} - {Name}", language.Code, language.Name);

        return _mapper.Map<LanguageDto>(language);
    }

    public async Task<IEnumerable<TranslationDto>> GetTranslationsAsync(string languageCode)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == languageCode && l.IsActive);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{languageCode}' not found");
        }

        var translations = await _context.Translations
            .Where(t => t.LanguageId == language.Id)
            .OrderBy(t => t.Category)
            .ThenBy(t => t.Key)
            .ToListAsync();

        return _mapper.Map<IEnumerable<TranslationDto>>(translations);
    }

    public async Task<TranslationResourceDto> GetTranslationResourcesAsync(string languageCode)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == languageCode && l.IsActive);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{languageCode}' not found");
        }

        var translations = await _context.Translations
            .Where(t => t.LanguageId == language.Id)
            .ToListAsync();

        // Group translations by category
        var resources = translations
            .GroupBy(t => t.Category)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(t => t.Key, t => t.Value)
            );

        return new TranslationResourceDto
        {
            LanguageCode = languageCode,
            Resources = resources
        };
    }

    public async Task<string?> GetTranslationAsync(string languageCode, string key)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == languageCode && l.IsActive);

        if (language is null)
        {
            return null;
        }

        var translation = await _context.Translations
            .FirstOrDefaultAsync(t => t.LanguageId == language.Id && t.Key == key);

        return translation?.Value;
    }

    public async Task<TranslationDto> UpsertTranslationAsync(string languageCode, UpsertTranslationDto upsertTranslationDto)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == languageCode && l.IsActive);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{languageCode}' not found");
        }

        var existingTranslation = await _context.Translations
            .FirstOrDefaultAsync(t => t.LanguageId == language.Id && t.Key == upsertTranslationDto.Key);

        if (existingTranslation is not null)
        {
            // Update existing translation
            existingTranslation.Value = upsertTranslationDto.Value;
            existingTranslation.Category = upsertTranslationDto.Category;
            existingTranslation.Description = upsertTranslationDto.Description;
            existingTranslation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated translation: {Key} for language {Code}", upsertTranslationDto.Key, languageCode);

            return _mapper.Map<TranslationDto>(existingTranslation);
        }
        else
        {
            // Create new translation
            var translation = new Translation
            {
                Key = upsertTranslationDto.Key,
                Value = upsertTranslationDto.Value,
                Category = upsertTranslationDto.Category,
                Description = upsertTranslationDto.Description,
                LanguageId = language.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Translations.Add(translation);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created translation: {Key} for language {Code}", upsertTranslationDto.Key, languageCode);

            return _mapper.Map<TranslationDto>(translation);
        }
    }

    public async Task BulkUpsertTranslationsAsync(BulkTranslationDto bulkTranslationDto)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == bulkTranslationDto.LanguageCode && l.IsActive);

        if (language is null)
        {
            throw new InvalidOperationException($"Language with code '{bulkTranslationDto.LanguageCode}' not found");
        }

        var existingTranslations = await _context.Translations
            .Where(t => t.LanguageId == language.Id)
            .ToListAsync();

        var now = DateTime.UtcNow;

        foreach (var (key, value) in bulkTranslationDto.Translations)
        {
            var existingTranslation = existingTranslations.FirstOrDefault(t => t.Key == key);

            if (existingTranslation is not null)
            {
                existingTranslation.Value = value;
                existingTranslation.UpdatedAt = now;
            }
            else
            {
                _context.Translations.Add(new Translation
                {
                    Key = key,
                    Value = value,
                    LanguageId = language.Id,
                    Category = "common",
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Bulk upserted {Count} translations for language {Code}",
            bulkTranslationDto.Translations.Count, bulkTranslationDto.LanguageCode);
    }

    public async Task<bool> DeleteTranslationAsync(string languageCode, string key)
    {
        var language = await _context.Languages
            .FirstOrDefaultAsync(l => l.Code == languageCode && l.IsActive);

        if (language is null)
        {
            return false;
        }

        var translation = await _context.Translations
            .FirstOrDefaultAsync(t => t.LanguageId == language.Id && t.Key == key);

        if (translation is null)
        {
            return false;
        }

        _context.Translations.Remove(translation);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted translation: {Key} for language {Code}", key, languageCode);

        return true;
    }

    public async Task SeedDefaultTranslationsAsync()
    {
        var english = await EnsureLanguageAsync("en", "English", "English", isDefault: false);
        var vietnamese = await EnsureLanguageAsync("vi", "Vietnamese", "Tiếng Việt", isDefault: true);

        var englishCount = await UpsertSeedAsync(english.Id, LoadEmbeddedLocale("en"));
        var vietnameseCount = await UpsertSeedAsync(vietnamese.Id, LoadEmbeddedLocale("vi"));

        _logger.LogInformation(
            "Seeded translations from locales/*.json: {EnglishCount} new for en, {VietnameseCount} new for vi",
            englishCount,
            vietnameseCount);
    }

    /// <summary>
    /// Lấy ngôn ngữ theo mã, tạo mới nếu chưa có.
    /// </summary>
    /// <remarks>
    /// Chỉ đặt IsDefault khi tạo mới. Nếu ngôn ngữ đã tồn tại thì tôn trọng lựa
    /// chọn hiện tại của admin — seed không được giành quyền quyết định ngôn ngữ
    /// mặc định ở mỗi lần khởi động.
    /// </remarks>
    private async Task<Language> EnsureLanguageAsync(string code, string name, string nativeName, bool isDefault)
    {
        var language = await _context.Languages.FirstOrDefaultAsync(l => l.Code == code);

        if (language is not null)
        {
            return language;
        }

        if (isDefault)
        {
            var currentDefault = await _context.Languages.FirstOrDefaultAsync(l => l.IsDefault);
            if (currentDefault is not null)
            {
                currentDefault.IsDefault = false;
            }
        }

        language = new Language
        {
            Code = code,
            Name = name,
            NativeName = nativeName,
            IsDefault = isDefault,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Languages.Add(language);
        await _context.SaveChangesAsync();

        return language;
    }

    /// <summary>
    /// Thêm những khoá chưa có trong DB, giữ nguyên khoá đã có.
    /// </summary>
    /// <remarks>
    /// Cố tình KHÔNG ghi đè: admin sửa bản dịch qua màn hình quản trị thì phải
    /// giữ được, kể cả khi seed chạy lại ở lần khởi động sau. Muốn quay về bản
    /// gốc thì xoá khoá đó đi rồi seed lại.
    /// </remarks>
    private async Task<int> UpsertSeedAsync(int languageId, IReadOnlyDictionary<string, string> messages)
    {
        if (messages.Count == 0)
        {
            return 0;
        }

        var existingKeys = await _context.Translations
            .Where(t => t.LanguageId == languageId)
            .Select(t => t.Key)
            .ToListAsync();

        var known = existingKeys.ToHashSet(StringComparer.Ordinal);
        var now = DateTime.UtcNow;
        var added = 0;

        foreach (var (key, value) in messages)
        {
            if (known.Contains(key))
            {
                continue;
            }

            _context.Translations.Add(new Translation
            {
                Key = key,
                Value = value,
                Category = CategoryOf(key),
                LanguageId = languageId,
                CreatedAt = now,
                UpdatedAt = now
            });
            added++;
        }

        if (added > 0)
        {
            await _context.SaveChangesAsync();
        }

        return added;
    }

    /// <summary>
    /// Nhóm của một khoá là đoạn trước dấu chấm đầu tiên: "invoices.dueDate" → "invoices".
    /// GetTranslationResourcesAsync gom bản dịch theo nhóm này.
    /// </summary>
    private static string CategoryOf(string key)
    {
        var separator = key.IndexOf('.');
        return separator > 0 ? key[..separator] : "common";
    }

    /// <summary>
    /// Đọc locales/{code}.json đã nhúng trong assembly.
    /// </summary>
    private IReadOnlyDictionary<string, string> LoadEmbeddedLocale(string code)
    {
        var resourceName = $"RentalManagement.Api.Resources.Locales.{code}.json";
        using var stream = typeof(LocalizationService).Assembly.GetManifestResourceStream(resourceName);

        if (stream is null)
        {
            // Không ném lỗi: seed chạy trong đường khởi động, thiếu một ngôn ngữ
            // không đáng để cả API không lên được.
            _logger.LogError("Embedded locale {ResourceName} not found; skipping seed for {Code}", resourceName, code);
            return new Dictionary<string, string>();
        }

        var messages = JsonSerializer.Deserialize<Dictionary<string, string>>(stream);

        if (messages is null)
        {
            _logger.LogError("Embedded locale {ResourceName} is not a flat JSON object; skipping seed", resourceName);
            return new Dictionary<string, string>();
        }

        return messages;
    }
}
