using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

/// <summary>
/// Verifies webhook signatures from payment providers
/// </summary>
public interface IWebhookVerifier
{
    /// <summary>
    /// Provider name this verifier handles
    /// </summary>
    string ProviderName { get; }
    
    /// <summary>
    /// Verify webhook signature
    /// </summary>
    Task<WebhookVerificationResult> VerifyWebhookAsync(
        string payload,
        string signature,
        Dictionary<string, string> headers,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Parse webhook payload into standard format
    /// </summary>
    Task<WebhookPayload> ParseWebhookPayloadAsync(
        string payload,
        CancellationToken cancellationToken = default);
}

public record WebhookVerificationResult(
    bool IsValid,
    string? ErrorMessage = null,
    DateTime? Timestamp = null);

public record WebhookPayload(
    string ExternalTransactionId,
    PaymentProviderStatus Status,
    Money Amount,
    DateTime EventTimestamp,
    string EventType,
    Dictionary<string, string>? AdditionalData = null);
