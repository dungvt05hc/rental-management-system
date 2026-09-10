using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

using RentalManagement.Api.Models.Email;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for the admin-only email test endpoint
/// </summary>
public class SendTestEmailDto
{
    /// <summary>
    /// Recipient address
    /// </summary>
    [Required]
    [EmailAddress]
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// Template to render. When omitted, a short plain test email is sent instead.
    /// </summary>
    /// <remarks>
    /// The converter is applied here rather than globally so the JSON contract of
    /// every other endpoint stays byte-for-byte what the frontend already expects.
    /// </remarks>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public EmailTemplate? Template { get; set; }
}
