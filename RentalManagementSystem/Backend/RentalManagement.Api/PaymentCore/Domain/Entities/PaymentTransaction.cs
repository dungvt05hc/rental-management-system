using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Entities;

/// <summary>
/// Payment Transaction - represents actual payment execution with provider
/// </summary>
public class PaymentTransaction
{
    public Guid Id { get; private set; }
    public Guid PaymentIntentId { get; private set; }
    public string ProviderName { get; private set; } = string.Empty;
    public string? ExternalTransactionId { get; private set; }
    public Money Amount { get; private set; } = null!;
    public TransactionStatus Status { get; private set; }
    public TransactionType Type { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public string? ProviderResponse { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }
    public string IdempotencyKey { get; private set; } = string.Empty;
    public string? Metadata { get; private set; }
    
    // EF Core constructor
    private PaymentTransaction() { }
    
    public static PaymentTransaction Create(
        Guid paymentIntentId, 
        string providerName, 
        Money amount,
        string idempotencyKey,
        TransactionType type = TransactionType.Payment)
    {
        if (string.IsNullOrWhiteSpace(providerName))
            throw new ArgumentException("Provider name is required", nameof(providerName));
            
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency key is required", nameof(idempotencyKey));
        
        return new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            PaymentIntentId = paymentIntentId,
            ProviderName = providerName,
            Amount = amount,
            Status = TransactionStatus.Pending,
            Type = type,
            CreatedAt = DateTime.UtcNow,
            IdempotencyKey = idempotencyKey
        };
    }
    
    public void MarkAsSuccessful(string externalTransactionId, string? providerResponse = null)
    {
        if (string.IsNullOrWhiteSpace(externalTransactionId))
            throw new ArgumentException("External transaction ID is required", nameof(externalTransactionId));
            
        Status = TransactionStatus.Completed;
        ExternalTransactionId = externalTransactionId;
        ProviderResponse = providerResponse;
        ProcessedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorCode, string errorMessage)
    {
        Status = TransactionStatus.Failed;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
        ProcessedAt = DateTime.UtcNow;
    }
    
    public void SetMetadata(string metadata)
    {
        Metadata = metadata;
    }
}
