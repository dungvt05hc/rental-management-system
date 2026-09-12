using System.Reflection;
using System.Text.Json;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RentalManagement.Api.Mappings;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Implementations;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Seed bản dịch đọc từ locales/*.json nhúng trong assembly, không hard-code.
/// </summary>
[Collection(PostgresCollection.Name)]
public class LocalizationSeedTests
{
    private readonly PostgresFixture _fixture;

    public LocalizationSeedTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Theory]
    [InlineData("en")]
    [InlineData("vi")]
    public void Locale_file_is_embedded_and_is_a_flat_string_map(string code)
    {
        var assembly = typeof(LocalizationService).Assembly;
        var resourceName = $"RentalManagement.Api.Resources.Locales.{code}.json";

        using var stream = assembly.GetManifestResourceStream(resourceName);

        Assert.NotNull(stream);

        var messages = JsonSerializer.Deserialize<Dictionary<string, string>>(stream!);

        Assert.NotNull(messages);
        Assert.NotEmpty(messages!);
    }

    [Fact]
    public void Vietnamese_covers_every_key_the_english_file_has()
    {
        var english = LoadEmbedded("en");
        var vietnamese = LoadEmbedded("vi");

        var missing = english.Keys.Where(key => !vietnamese.ContainsKey(key)).OrderBy(k => k).ToList();

        // Cùng bất biến mà `npm run i18n:check` bảo vệ, kiểm lại ở phía backend
        // để bản build không kèm một bảng dịch thiếu khoá.
        Assert.True(missing.Count == 0, $"Thiếu bản dịch tiếng Việt: {string.Join(", ", missing.Take(10))}");
    }

    [Fact]
    public void Vietnamese_has_no_untranslated_leftovers()
    {
        var english = LoadEmbedded("en");
        var vietnamese = LoadEmbedded("vi");

        // Một số chuỗi trùng nhau là hợp lệ ("Email", "JSON", "Momo", mã mẫu),
        // nhưng một câu dài giống hệt tiếng Anh thì gần như chắc chắn là quên dịch.
        var suspicious = english
            .Where(pair => vietnamese.TryGetValue(pair.Key, out var vi)
                           && string.Equals(vi, pair.Value, StringComparison.Ordinal)
                           && pair.Value.Count(char.IsWhiteSpace) >= 2)
            .Select(pair => pair.Key)
            .OrderBy(key => key)
            .ToList();

        Assert.True(suspicious.Count == 0, $"Có vẻ chưa dịch: {string.Join(", ", suspicious)}");
    }

    [Fact]
    public async Task Seed_inserts_missing_keys_and_leaves_edited_ones_alone()
    {
        await using var context = _fixture.CreateContext();
        var service = CreateService(context);

        await service.SeedDefaultTranslationsAsync();

        var vietnamese = await context.Languages.SingleAsync(l => l.Code == "vi");

        // Tiếng Việt là ngôn ngữ mặc định của hệ thống.
        Assert.True(vietnamese.IsDefault);

        var seeded = await context.Translations
            .CountAsync(t => t.LanguageId == vietnamese.Id);
        Assert.True(seeded > 100, $"chỉ seed được {seeded} bản dịch");

        // Admin sửa một bản dịch qua màn hình quản trị...
        var edited = await context.Translations
            .FirstAsync(t => t.LanguageId == vietnamese.Id && t.Key == "common.save");
        edited.Value = "Ghi lại";
        await context.SaveChangesAsync();

        // ...seed chạy lại ở lần khởi động sau không được ghi đè lên.
        await service.SeedDefaultTranslationsAsync();
        await context.Entry(edited).ReloadAsync();

        Assert.Equal("Ghi lại", edited.Value);
    }

    [Fact]
    public async Task Seed_groups_each_key_under_the_category_its_name_starts_with()
    {
        await using var context = _fixture.CreateContext();
        var service = CreateService(context);

        await service.SeedDefaultTranslationsAsync();

        var resources = await service.GetTranslationResourcesAsync("vi");

        Assert.Contains("invoices", resources.Resources.Keys);
        Assert.Contains("rooms", resources.Resources.Keys);
        Assert.Equal("Hoá đơn", resources.Resources["invoices"]["invoices.title"]);
        Assert.Equal("Phòng", resources.Resources["rooms"]["rooms.title"]);
    }

    private static LocalizationService CreateService(Data.RentalManagementContext context)
    {
        var mapper = new MapperConfiguration(config => config.AddProfile<MappingProfile>()).CreateMapper();
        return new LocalizationService(context, mapper, NullLogger<LocalizationService>.Instance);
    }

    private static Dictionary<string, string> LoadEmbedded(string code)
    {
        var assembly = typeof(LocalizationService).Assembly;
        using var stream = assembly.GetManifestResourceStream(
            $"RentalManagement.Api.Resources.Locales.{code}.json");

        Assert.NotNull(stream);

        return JsonSerializer.Deserialize<Dictionary<string, string>>(stream!)!;
    }
}
