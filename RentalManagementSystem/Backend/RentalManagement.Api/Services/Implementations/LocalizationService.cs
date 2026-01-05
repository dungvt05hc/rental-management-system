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
        // Create English language
        var english = await _context.Languages.FirstOrDefaultAsync(l => l.Code == "en");
        if (english is null)
        {
            english = new Language
            {
                Code = "en",
                Name = "English",
                NativeName = "English",
                IsDefault = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Languages.Add(english);
            await _context.SaveChangesAsync();
        }

        // Create Vietnamese language
        var vietnamese = await _context.Languages.FirstOrDefaultAsync(l => l.Code == "vi");
        if (vietnamese is null)
        {
            vietnamese = new Language
            {
                Code = "vi",
                Name = "Vietnamese",
                NativeName = "Tiếng Việt",
                IsDefault = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Languages.Add(vietnamese);
            await _context.SaveChangesAsync();
        }

        // Seed English translations
        await SeedEnglishTranslationsAsync(english.Id);

        // Seed Vietnamese translations
        await SeedVietnameseTranslationsAsync(vietnamese.Id);

        _logger.LogInformation("Default translations seeded successfully");
    }

    private async Task SeedEnglishTranslationsAsync(int languageId)
    {
        var translations = GetEnglishTranslations(languageId);
        await UpsertTranslationsAsync(translations);
    }

    private async Task SeedVietnameseTranslationsAsync(int languageId)
    {
        var translations = GetVietnameseTranslations(languageId);
        await UpsertTranslationsAsync(translations);
    }

    private async Task UpsertTranslationsAsync(List<Translation> translations)
    {
        var keys = translations.Select(t => t.Key).ToList();
        var languageId = translations.First().LanguageId;

        var existingTranslations = await _context.Translations
            .Where(t => t.LanguageId == languageId && keys.Contains(t.Key))
            .ToListAsync();

        foreach (var translation in translations)
        {
            var existing = existingTranslations.FirstOrDefault(t => t.Key == translation.Key);
            if (existing is null)
            {
                _context.Translations.Add(translation);
            }
        }

        await _context.SaveChangesAsync();
    }

    private static List<Translation> GetEnglishTranslations(int languageId)
    {
        var now = DateTime.UtcNow;
        return new List<Translation>
        {
            // Common
            new() { LanguageId = languageId, Key = "common.save", Value = "Save", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.cancel", Value = "Cancel", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.delete", Value = "Delete", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.edit", Value = "Edit", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.add", Value = "Add", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.search", Value = "Search", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.filter", Value = "Filter", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.refresh", Value = "Refresh", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.loading", Value = "Loading...", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.success", Value = "Success", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.error", Value = "Error", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.confirm", Value = "Confirm", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.yes", Value = "Yes", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.no", Value = "No", Category = "common", CreatedAt = now, UpdatedAt = now },

            // Authentication
            new() { LanguageId = languageId, Key = "auth.login", Value = "Login", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.logout", Value = "Logout", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.register", Value = "Register", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.username", Value = "Username", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.password", Value = "Password", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.email", Value = "Email", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.forgotPassword", Value = "Forgot Password?", Category = "auth", CreatedAt = now, UpdatedAt = now },

            // Rooms
            new() { LanguageId = languageId, Key = "rooms.title", Value = "Rooms", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.roomNumber", Value = "Room Number", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.roomType", Value = "Room Type", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.status", Value = "Status", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.price", Value = "Price", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.available", Value = "Available", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.occupied", Value = "Occupied", Category = "rooms", CreatedAt = now, UpdatedAt = now },

            // Tenants
            new() { LanguageId = languageId, Key = "tenants.title", Value = "Tenants", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.name", Value = "Name", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.phone", Value = "Phone", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.idCard", Value = "ID Card", Category = "tenants", CreatedAt = now, UpdatedAt = now },

            // Invoices
            new() { LanguageId = languageId, Key = "invoices.title", Value = "Invoices", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.invoiceNumber", Value = "Invoice Number", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.amount", Value = "Amount", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.dueDate", Value = "Due Date", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.paid", Value = "Paid", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.unpaid", Value = "Unpaid", Category = "invoices", CreatedAt = now, UpdatedAt = now },

            // Dashboard
            new() { LanguageId = languageId, Key = "dashboard.title", Value = "Dashboard", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.totalRooms", Value = "Total Rooms", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.occupiedRooms", Value = "Occupied Rooms", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.revenue", Value = "Revenue", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
        };
    }

    private static List<Translation> GetVietnameseTranslations(int languageId)
    {
        var now = DateTime.UtcNow;
        return new List<Translation>
        {
            // Common
            new() { LanguageId = languageId, Key = "common.save", Value = "Lưu", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.cancel", Value = "Hủy", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.delete", Value = "Xóa", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.edit", Value = "Chỉnh sửa", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.add", Value = "Thêm", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.search", Value = "Tìm kiếm", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.filter", Value = "Lọc", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.refresh", Value = "Làm mới", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.loading", Value = "Đang tải...", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.success", Value = "Thành công", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.error", Value = "Lỗi", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.confirm", Value = "Xác nhận", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.yes", Value = "Có", Category = "common", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "common.no", Value = "Không", Category = "common", CreatedAt = now, UpdatedAt = now },

            // Authentication
            new() { LanguageId = languageId, Key = "auth.login", Value = "Đăng nhập", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.logout", Value = "Đăng xuất", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.register", Value = "Đăng ký", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.username", Value = "Tên đăng nhập", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.password", Value = "Mật khẩu", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.email", Value = "Email", Category = "auth", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "auth.forgotPassword", Value = "Quên mật khẩu?", Category = "auth", CreatedAt = now, UpdatedAt = now },

            // Rooms
            new() { LanguageId = languageId, Key = "rooms.title", Value = "Phòng trọ", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.roomNumber", Value = "Số phòng", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.roomType", Value = "Loại phòng", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.status", Value = "Trạng thái", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.price", Value = "Giá", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.available", Value = "Còn trống", Category = "rooms", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "rooms.occupied", Value = "Đã thuê", Category = "rooms", CreatedAt = now, UpdatedAt = now },

            // Tenants
            new() { LanguageId = languageId, Key = "tenants.title", Value = "Người thuê", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.name", Value = "Họ tên", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.phone", Value = "Số điện thoại", Category = "tenants", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "tenants.idCard", Value = "CMND/CCCD", Category = "tenants", CreatedAt = now, UpdatedAt = now },

            // Invoices
            new() { LanguageId = languageId, Key = "invoices.title", Value = "Hóa đơn", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.invoiceNumber", Value = "Số hóa đơn", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.amount", Value = "Số tiền", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.dueDate", Value = "Hạn thanh toán", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.paid", Value = "Đã thanh toán", Category = "invoices", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "invoices.unpaid", Value = "Chưa thanh toán", Category = "invoices", CreatedAt = now, UpdatedAt = now },

            // Dashboard
            new() { LanguageId = languageId, Key = "dashboard.title", Value = "Bảng điều khiển", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.totalRooms", Value = "Tổng số phòng", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.occupiedRooms", Value = "Phòng đã thuê", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
            new() { LanguageId = languageId, Key = "dashboard.revenue", Value = "Doanh thu", Category = "dashboard", CreatedAt = now, UpdatedAt = now },
        };
    }
}
