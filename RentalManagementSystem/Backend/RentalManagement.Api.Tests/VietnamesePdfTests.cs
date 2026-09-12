using System.Globalization;
using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RentalManagement.Api.Services.Implementations;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Hoá đơn PDF phải in được dấu tiếng Việt.
/// </summary>
/// <remarks>
/// Đây là lỗi rất dễ lọt: trên máy dev macOS có sẵn Arial nên PDF nhìn vẫn
/// đúng, còn container Linux lúc deploy thì không có font nào phủ tiếng Việt và
/// chữ ra ô vuông — mà không có exception nào cả nếu tắt kiểm tra glyph.
/// </remarks>
public class VietnamesePdfTests
{
    /// <summary>Đủ bộ dấu thanh, các nguyên âm đặc biệt và chữ đ.</summary>
    private const string VietnameseSample =
        "Phòng trọ — hoá đơn tiền thuê, điện nước, tiền cọc. "
        + "Nguyễn Văn An, Đặng Thị Hưởng, Lê Quỳnh Như. "
        + "ăâêôơưđ ÁÀẢÃẠ ẮẰẲẴẶ ẤẦẨẪẬ ÉÈẺẼẸ ẾỀỂỄỆ ÍÌỈĨỊ "
        + "ÓÒỎÕỌ ỐỒỔỖỘ ỚỜỞỠỢ ÚÙỦŨỤ ỨỪỬỮỰ ÝỲỶỸỴ";

    private static readonly Assembly ApiAssembly = typeof(PdfService).Assembly;

    [Fact]
    public void Api_assembly_embeds_the_pdf_fonts()
    {
        var fonts = ApiAssembly.GetManifestResourceNames()
            .Where(name => name.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.NotEmpty(fonts);
        Assert.Contains(fonts, name => name.Contains("Roboto-Regular", StringComparison.Ordinal));
        Assert.Contains(fonts, name => name.Contains("Roboto-Bold", StringComparison.Ordinal));
    }

    [Fact]
    public void Embedded_font_renders_every_vietnamese_diacritic()
    {
        RegisterEmbeddedFonts();

        QuestPDF.Settings.License = LicenseType.Community;
        // Mặc định QuestPDF ném lỗi khi gặp ký tự font không vẽ được. Đó chính
        // là điều kiểm tra này dựa vào — nếu Roboto thiếu glyph tiếng Việt nào,
        // GeneratePdf() sẽ ném chứ không lặng lẽ vẽ ô vuông.
        QuestPDF.Settings.CheckIfAllTextGlyphsAreAvailable = true;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(style => style.FontFamily("Roboto").FontSize(11));
                page.Content().Column(column =>
                {
                    column.Item().Text(VietnameseSample);
                    column.Item().Text(VietnameseSample).Bold();
                    column.Item().Text(VietnameseSample).Italic();
                });
            });
        });

        var pdf = document.GeneratePdf();

        Assert.NotEmpty(pdf);
    }

    [Fact]
    public void Money_is_formatted_the_vietnamese_way()
    {
        var vietnamese = CultureInfo.GetCultureInfo("vi-VN");

        // VND có ISO minor unit = 0 nên "C0": không phần thập phân, dấu chấm
        // ngăn nghìn, ký hiệu đứng sau.
        var formatted = 12000m.ToString("C0", vietnamese);

        Assert.Contains("12.000", formatted, StringComparison.Ordinal);
        Assert.Contains("₫", formatted, StringComparison.Ordinal);
        Assert.DoesNotContain(",00", formatted, StringComparison.Ordinal);
    }

    [Fact]
    public void Dates_are_formatted_day_first()
    {
        var vietnamese = CultureInfo.GetCultureInfo("vi-VN");

        Assert.Equal("09/03/2026", new DateTime(2026, 3, 9).ToString("dd/MM/yyyy", vietnamese));
    }

    private static void RegisterEmbeddedFonts()
    {
        foreach (var resourceName in ApiAssembly.GetManifestResourceNames())
        {
            if (!resourceName.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            using var stream = ApiAssembly.GetManifestResourceStream(resourceName);
            if (stream is not null)
            {
                FontManager.RegisterFont(stream);
            }
        }
    }
}
