using System.Collections.Concurrent;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Render template email từ embedded resource. Template được nhúng vào assembly
/// nên deploy chỉ có một file nhị phân, không phụ thuộc thư mục nội dung.
/// </summary>
public partial class EmailTemplateRenderer : IEmailTemplateRenderer
{
    private const string ResourcePrefix = "RentalManagement.Api.Resources.EmailTemplates.";

    private static readonly Assembly TemplateAssembly = typeof(EmailTemplateRenderer).Assembly;

    /// <summary>
    /// Template đã đọc từ resource, cache theo tên file. Nội dung không đổi
    /// trong suốt vòng đời process nên đọc một lần là đủ.
    /// </summary>
    private static readonly ConcurrentDictionary<string, string> TemplateCache = new();

    private readonly ILogger<EmailTemplateRenderer> _logger;

    public EmailTemplateRenderer(ILogger<EmailTemplateRenderer> logger)
    {
        _logger = logger;
    }

    public RenderedEmail Render(EmailTemplate template, string language, object? model)
    {
        var html = LoadTemplate(template, language);
        var values = ReadModel(model);

        // Tiêu đề là văn bản thuần nên không HTML-encode; phần thân thì có.
        var subject = Substitute(ExtractSubject(html, template), values, template, htmlEncode: false);
        var body = Substitute(html, values, template, htmlEncode: true);

        return new RenderedEmail(subject, body);
    }

    private string LoadTemplate(EmailTemplate template, string language)
    {
        var normalized = string.IsNullOrWhiteSpace(language)
            ? EmailSettings.FallbackLanguage
            : language.Trim().ToLowerInvariant();

        if (TryLoad(template, normalized, out var html))
        {
            return html;
        }

        if (normalized != EmailSettings.FallbackLanguage)
        {
            _logger.LogWarning(
                "No {Template} template for language {Language}, falling back to {Fallback}",
                template, normalized, EmailSettings.FallbackLanguage);

            if (TryLoad(template, EmailSettings.FallbackLanguage, out html))
            {
                return html;
            }
        }

        throw new InvalidOperationException(
            $"Email template '{template}' is missing for language '{normalized}' and for the fallback language.");
    }

    private static bool TryLoad(EmailTemplate template, string language, out string html)
    {
        var resourceName = $"{ResourcePrefix}{template}.{language}.html";

        html = TemplateCache.GetOrAdd(resourceName, static name =>
        {
            using var stream = TemplateAssembly.GetManifestResourceStream(name);
            if (stream is null)
            {
                return string.Empty;
            }

            // UTF-8 tường minh: nội dung tiếng Việt có dấu phải đọc đúng bảng mã,
            // không phụ thuộc locale của máy chủ.
            using var reader = new StreamReader(stream, Encoding.UTF8);
            return reader.ReadToEnd();
        });

        return html.Length > 0;
    }

    private static string ExtractSubject(string html, EmailTemplate template)
    {
        var match = TitleRegex().Match(html);

        if (!match.Success)
        {
            throw new InvalidOperationException(
                $"Email template '{template}' has no <title> element to use as the subject.");
        }

        return WebUtility.HtmlDecode(match.Groups[1].Value).Trim();
    }

    /// <summary>
    /// Thay <c>{{Tên}}</c> bằng giá trị trong model. Trong phần thân HTML, giá trị
    /// luôn được encode nên dữ liệu người dùng (tên, email) không thể chèn thẻ
    /// vào email.
    /// </summary>
    private static string Substitute(
        string content,
        IReadOnlyDictionary<string, string> values,
        EmailTemplate template,
        bool htmlEncode)
    {
        return PlaceholderRegex().Replace(content, match =>
        {
            var name = match.Groups[1].Value;

            if (!values.TryGetValue(name, out var value))
            {
                throw new InvalidOperationException(
                    $"Email template '{template}' uses placeholder '{{{{{name}}}}}' but the model has no such property.");
            }

            return htmlEncode ? WebUtility.HtmlEncode(value) : value;
        });
    }

    private static IReadOnlyDictionary<string, string> ReadModel(object? model)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (model is null)
        {
            return values;
        }

        foreach (var property in model.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (property.GetIndexParameters().Length > 0)
            {
                continue;
            }

            values[property.Name] = property.GetValue(model)?.ToString() ?? string.Empty;
        }

        return values;
    }

    [GeneratedRegex(@"<title>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleRegex();

    [GeneratedRegex(@"\{\{\s*(\w+)\s*\}\}")]
    private static partial Regex PlaceholderRegex();
}
