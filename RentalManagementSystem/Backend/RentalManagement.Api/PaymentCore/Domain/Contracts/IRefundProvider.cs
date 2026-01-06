using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

/// <summary>
/// Handles refund operations for payment providers
/// </summary>
public interface IRefundProvider
{
    /// <summary>
    /// Provider name this refund handler supports
    /// </summary>
    string ProviderName { get; }
    
    /// <summary>
    /// Create a refund for a completed payment
    /// </summary>
    Task<RefundResult> CreateRefundAsync(
        CreateRefundRequest request,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query refund status from provider
    /// </summary>
    Task<RefundStatusResult> GetRefundStatusAsync(
        string externalRefundId,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if partial refunds are supported
    /// </summary>
    bool SupportsPartialRefunds { get; }
}

public record CreateRefundRequest(
    string ExternalTransactionId,
    Money Amount,
    string Reason,
    string? ReasonDescription = null,
    Dictionary<string, string>? Metadata = null);

public record RefundResult(
    bool Success,
    string? ExternalRefundId,
    RefundProviderStatus Status,
    Money RefundedAmount,
    string? ErrorCode = null,
    string? ErrorMessage = null);

public record RefundStatusResult(
    string ExternalRefundId,
    RefundProviderStatus Status,
    Money Amount,
    DateTime? CompletedAt);
