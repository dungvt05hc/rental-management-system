using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

/// <summary>
/// Core contract for all payment providers - handles payment initiation and queries
/// </summary>
public interface IPaymentProvider
{
    /// <summary>
    /// Provider name (e.g., "MoMo", "Visa", "PayPal")
    /// </summary>
    string ProviderName { get; }
    
    /// <summary>
    /// Supported payment method types
    /// </summary>
    IReadOnlyCollection<PaymentMethodType> SupportedMethods { get; }
    
    /// <summary>
    /// Create a new payment with the provider
    /// </summary>
    Task<PaymentProviderResult> CreatePaymentAsync(
        CreatePaymentRequest request, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query payment status from provider
    /// </summary>
    Task<PaymentStatusResult> GetPaymentStatusAsync(
        string externalTransactionId, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Cancel a pending payment
    /// </summary>
    Task<CancelPaymentResult> CancelPaymentAsync(
        string externalTransactionId, 
        CancellationToken cancellationToken = default);
}

public record CreatePaymentRequest(
    Guid PaymentIntentId,
    Money Amount,
    string Currency,
    string Description,
    string ReturnUrl,
    string CancelUrl,
    string NotifyUrl,
    Dictionary<string, string>? Metadata = null);

public record PaymentProviderResult(
    bool Success,
    string? ExternalTransactionId,
    string? RedirectUrl,
    string? QrCodeData,
    PaymentProviderStatus Status,
    string? ErrorCode = null,
    string? ErrorMessage = null,
    Dictionary<string, string>? Metadata = null);

public record PaymentStatusResult(
    string ExternalTransactionId,
    PaymentProviderStatus Status,
    Money Amount,
    DateTime? CompletedAt,
    string? ErrorCode = null,
    string? ErrorMessage = null);

public record CancelPaymentResult(
    bool Success,
    string? ErrorCode = null,
    string? ErrorMessage = null);
