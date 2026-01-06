using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Entities;

/// <summary>
/// Refund - represents a payment reversal
/// </summary>
public class Refund
{
    public Guid Id { get; private set; }
    public Guid PaymentTransactionId { get; private set; }
    public Money Amount { get; private set; } = null!;
    public RefundReason Reason { get; private set; }
    public string? ReasonDescription { get; private set; }
    public RefundStatus Status { get; private set; }
    public string? ExternalRefundId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public string? ProviderResponse { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }
    public string IdempotencyKey { get; private set; } = string.Empty;
    
    // EF Core constructor
    private Refund() { }
    
    public static Refund Create(
        Guid paymentTransactionId,
        Money amount,
        RefundReason reason,
        string? reasonDescription,
        Guid createdByUserId,
        string idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency key is required", nameof(idempotencyKey));
        
        return new Refund
        {
            Id = Guid.NewGuid(),
            PaymentTransactionId = paymentTransactionId,
            Amount = amount,
            Reason = reason,
            ReasonDescription = reasonDescription,
            Status = RefundStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId,
            IdempotencyKey = idempotencyKey
        };
    }
    
    public void MarkAsSuccessful(string externalRefundId, string? providerResponse = null)
    {
        if (string.IsNullOrWhiteSpace(externalRefundId))
            throw new ArgumentException("External refund ID is required", nameof(externalRefundId));
            
        Status = RefundStatus.Succeeded;
        ExternalRefundId = externalRefundId;
        ProviderResponse = providerResponse;
        ProcessedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorCode, string errorMessage)
    {
        Status = RefundStatus.Failed;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
        ProcessedAt = DateTime.UtcNow;
    }
    
    public void Cancel()
    {
        if (Status != RefundStatus.Pending)
            throw new InvalidOperationException($"Cannot cancel refund in {Status} status");
            
        Status = RefundStatus.Cancelled;
        ProcessedAt = DateTime.UtcNow;
    }
}
