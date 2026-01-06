using RentalManagement.Api.PaymentCore.Domain.ValueObjects;
using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Entities;

/// <summary>
/// Payment Intent - represents an attempt to pay an invoice
/// Aggregate root for payment processing
/// </summary>
public class PaymentIntent
{
    public Guid Id { get; private set; }
    public Guid InvoiceId { get; private set; }
    public Money Amount { get; private set; } = null!;
    public PaymentMethodType MethodType { get; private set; }
    public PaymentIntentStatus Status { get; private set; }
    public string? ClientSecret { get; private set; }
    public string? RedirectUrl { get; private set; }
    public string? QrCodeData { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? CancellationReason { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();
    
    private readonly List<PaymentTransaction> _transactions = new();
    public IReadOnlyCollection<PaymentTransaction> Transactions => _transactions.AsReadOnly();
    
    // EF Core constructor
    private PaymentIntent() { }
    
    public static PaymentIntent Create(Guid invoiceId, Money amount, PaymentMethodType methodType)
    {
        return new PaymentIntent
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            Amount = amount,
            MethodType = methodType,
            Status = PaymentIntentStatus.Created,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
    }
    
    public void Authorize(string? redirectUrl = null, string? qrCodeData = null, string? clientSecret = null)
    {
        if (Status != PaymentIntentStatus.Created)
            throw new InvalidOperationException($"Can only authorize payment intents in Created status, current status: {Status}");
            
        Status = PaymentIntentStatus.RequiresAction;
        RedirectUrl = redirectUrl;
        QrCodeData = qrCodeData;
        ClientSecret = clientSecret;
    }
    
    public void MarkAsProcessing()
    {
        if (Status != PaymentIntentStatus.RequiresAction && Status != PaymentIntentStatus.Created)
            throw new InvalidOperationException($"Cannot process payment in {Status} status");
            
        Status = PaymentIntentStatus.Processing;
    }
    
    public void MarkAsSucceeded()
    {
        if (Status == PaymentIntentStatus.Succeeded)
            return;
            
        if (Status == PaymentIntentStatus.Cancelled)
            throw new InvalidOperationException("Cannot mark cancelled payment as succeeded");
            
        Status = PaymentIntentStatus.Succeeded;
        CompletedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorCode, string errorMessage)
    {
        if (Status == PaymentIntentStatus.Succeeded)
            throw new InvalidOperationException("Cannot mark succeeded payment as failed");
            
        Status = PaymentIntentStatus.Failed;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }
    
    public void Cancel(string reason)
    {
        if (Status == PaymentIntentStatus.Succeeded)
            throw new InvalidOperationException("Cannot cancel succeeded payment intent");
            
        Status = PaymentIntentStatus.Cancelled;
        CancellationReason = reason;
    }
    
    public bool IsExpired() => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;
    
    public void AddTransaction(PaymentTransaction transaction)
    {
        _transactions.Add(transaction);
    }
}
