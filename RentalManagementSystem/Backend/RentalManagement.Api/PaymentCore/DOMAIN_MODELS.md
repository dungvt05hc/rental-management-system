# Domain Models & State Machines

## 1. Domain Entities

### 1.1 Invoice Entity

```csharp
/// <summary>
/// Invoice aggregate root - represents a billing document for rental services
/// </summary>
public class Invoice
{
    public Guid Id { get; private set; }
    public string InvoiceNumber { get; private set; }
    public Guid TenantId { get; private set; }
    public DateTime IssueDate { get; private set; }
    public DateTime DueDate { get; private set; }
    public Money TotalAmount { get; private set; }
    public InvoiceStatus Status { get; private set; }
    public byte[] RowVersion { get; private set; } // Optimistic concurrency
    
    // Navigation properties
    private readonly List<InvoiceLineItem> _lineItems = new();
    public IReadOnlyCollection<InvoiceLineItem> LineItems => _lineItems.AsReadOnly();
    
    private readonly List<PaymentIntent> _paymentIntents = new();
    public IReadOnlyCollection<PaymentIntent> PaymentIntents => _paymentIntents.AsReadOnly();
    
    // Domain events
    private readonly List<IDomainEvent> _domainEvents = new();
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    
    // Business logic
    public PaymentIntent CreatePaymentIntent(Money amount, PaymentMethodType methodType)
    {
        if (Status == InvoiceStatus.Paid)
            throw new DomainException("Cannot create payment intent for already paid invoice");
            
        if (Status == InvoiceStatus.Cancelled)
            throw new DomainException("Cannot create payment intent for cancelled invoice");
            
        var remainingAmount = CalculateRemainingAmount();
        if (amount.Amount > remainingAmount.Amount)
            throw new DomainException("Payment amount exceeds remaining balance");
            
        var intent = PaymentIntent.Create(Id, amount, methodType);
        _paymentIntents.Add(intent);
        _domainEvents.Add(new PaymentIntentCreatedEvent(Id, intent.Id));
        
        return intent;
    }
    
    public void MarkAsPaid()
    {
        if (Status == InvoiceStatus.Paid)
            return;
            
        Status = InvoiceStatus.Paid;
        _domainEvents.Add(new InvoicePaidEvent(Id, TotalAmount));
    }
    
    public Money CalculateRemainingAmount()
    {
        var paidAmount = _paymentIntents
            .Where(p => p.Status == PaymentIntentStatus.Succeeded)
            .Sum(p => p.Amount.Amount);
            
        return new Money(TotalAmount.Amount - paidAmount, TotalAmount.Currency);
    }
}

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    PartiallyPaid = 2,
    Paid = 3,
    Overdue = 4,
    Cancelled = 5,
    Refunded = 6
}
```

### 1.2 PaymentIntent Entity

```csharp
/// <summary>
/// Payment Intent - represents an attempt to pay an invoice
/// </summary>
public class PaymentIntent
{
    public Guid Id { get; private set; }
    public Guid InvoiceId { get; private set; }
    public Money Amount { get; private set; }
    public string Currency { get; private set; }
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
    public byte[] RowVersion { get; private set; }
    
    // Navigation properties
    private readonly List<PaymentTransaction> _transactions = new();
    public IReadOnlyCollection<PaymentTransaction> Transactions => _transactions.AsReadOnly();
    
    public static PaymentIntent Create(Guid invoiceId, Money amount, PaymentMethodType methodType)
    {
        return new PaymentIntent
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            Amount = amount,
            Currency = amount.Currency,
            MethodType = methodType,
            Status = PaymentIntentStatus.Created,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15) // 15 min expiry
        };
    }
    
    public void Authorize(string? redirectUrl = null, string? qrCodeData = null)
    {
        if (Status != PaymentIntentStatus.Created)
            throw new DomainException("Can only authorize newly created payment intents");
            
        Status = PaymentIntentStatus.RequiresAction;
        RedirectUrl = redirectUrl;
        QrCodeData = qrCodeData;
    }
    
    public void MarkAsProcessing()
    {
        if (Status != PaymentIntentStatus.RequiresAction && Status != PaymentIntentStatus.Created)
            throw new DomainException($"Cannot process payment in {Status} status");
            
        Status = PaymentIntentStatus.Processing;
    }
    
    public void MarkAsSucceeded()
    {
        if (Status == PaymentIntentStatus.Succeeded)
            return;
            
        Status = PaymentIntentStatus.Succeeded;
        CompletedAt = DateTime.UtcNow;
    }
    
    public void MarkAsFailed(string errorCode, string errorMessage)
    {
        Status = PaymentIntentStatus.Failed;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }
    
    public void Cancel(string reason)
    {
        if (Status == PaymentIntentStatus.Succeeded)
            throw new DomainException("Cannot cancel succeeded payment intent");
            
        Status = PaymentIntentStatus.Cancelled;
        CancellationReason = reason;
    }
    
    public bool IsExpired()
    {
        return ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;
    }
}

public enum PaymentIntentStatus
{
    Created = 0,           // Initial state
    RequiresAction = 1,    // Waiting for user action (redirect, QR scan)
    Processing = 2,        // Payment being processed by provider
    Succeeded = 3,         // Payment successful
    Failed = 4,            // Payment failed
    Cancelled = 5,         // Cancelled by user or expired
    RequiresCapture = 6    // Authorized but not captured (for card payments)
}

public enum PaymentMethodType
{
    Cash = 0,
    MoMo = 1,
    ZaloPay = 2,
    VNPay = 3,
    Visa = 4,
    Mastercard = 5,
    PayPal = 6,
    BankTransfer = 7,
    QRCode = 8
}
```

### 1.3 PaymentTransaction Entity

```csharp
/// <summary>
/// Payment Transaction - represents actual payment execution with provider
/// </summary>
public class PaymentTransaction
{
    public Guid Id { get; private set; }
    public Guid PaymentIntentId { get; private set; }
    public string ProviderName { get; private set; }
    public string? ExternalTransactionId { get; private set; }
    public Money Amount { get; private set; }
    public TransactionStatus Status { get; private set; }
    public TransactionType Type { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public string? ProviderResponse { get; private set; }
    public string? ErrorCode { get; private set; }
    public string? ErrorMessage { get; private set; }
    public string IdempotencyKey { get; private set; }
    
    // Provider-specific metadata stored as JSON
    public string? Metadata { get; private set; }
    
    public static PaymentTransaction Create(
        Guid paymentIntentId, 
        string providerName, 
        Money amount,
        string idempotencyKey,
        TransactionType type = TransactionType.Payment)
    {
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
}

public enum TransactionStatus
{
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Refunded = 3,
    PartiallyRefunded = 4
}

public enum TransactionType
{
    Payment = 0,
    Refund = 1,
    Capture = 2,
    Void = 3
}
```

### 1.4 Refund Entity

```csharp
/// <summary>
/// Refund - represents a payment reversal
/// </summary>
public class Refund
{
    public Guid Id { get; private set; }
    public Guid PaymentTransactionId { get; private set; }
    public Money Amount { get; private set; }
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
    public string IdempotencyKey { get; private set; }
    
    public static Refund Create(
        Guid paymentTransactionId,
        Money amount,
        RefundReason reason,
        string? reasonDescription,
        Guid createdByUserId,
        string idempotencyKey)
    {
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
}

public enum RefundStatus
{
    Pending = 0,
    Succeeded = 1,
    Failed = 2,
    Cancelled = 3
}

public enum RefundReason
{
    Duplicate = 0,
    Fraudulent = 1,
    RequestedByCustomer = 2,
    ServiceNotProvided = 3,
    Other = 99
}
```

### 1.5 PaymentAuditLog Entity

```csharp
/// <summary>
/// Immutable audit log for all payment operations
/// </summary>
public class PaymentAuditLog
{
    public Guid Id { get; private set; }
    public string EntityType { get; private set; }
    public Guid EntityId { get; private set; }
    public string Action { get; private set; }
    public string? OldValue { get; private set; }
    public string? NewValue { get; private set; }
    public DateTime Timestamp { get; private set; }
    public Guid? UserId { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public string CorrelationId { get; private set; }
}
```

## 2. Value Objects

### 2.1 Money Value Object

```csharp
/// <summary>
/// Money value object - ensures amount and currency consistency
/// </summary>
public record Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }
    
    public Money(decimal amount, string currency)
    {
        if (amount < 0)
            throw new ArgumentException("Amount cannot be negative", nameof(amount));
            
        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Currency is required", nameof(currency));
            
        Amount = Math.Round(amount, 2);
        Currency = currency.ToUpperInvariant();
    }
    
    public static Money Zero(string currency) => new(0, currency);
    
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("Cannot add money with different currencies");
            
        return new Money(a.Amount + b.Amount, a.Currency);
    }
    
    public static Money operator -(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("Cannot subtract money with different currencies");
            
        return new Money(a.Amount - b.Amount, a.Currency);
    }
    
    public bool IsGreaterThan(Money other) => Amount > other.Amount && Currency == other.Currency;
    public bool IsLessThan(Money other) => Amount < other.Amount && Currency == other.Currency;
}
```

### 2.2 PaymentMethodInfo Value Object

```csharp
/// <summary>
/// Payment method information - tokenized/safe representation
/// </summary>
public record PaymentMethodInfo
{
    public PaymentMethodType Type { get; init; }
    public string? Last4Digits { get; init; }
    public string? BankName { get; init; }
    public string? AccountHolderName { get; init; }
    public string? ProviderToken { get; init; }
    public DateTime? ExpiryDate { get; init; }
    
    // Never store full card numbers, CVV, or PINs
    public static PaymentMethodInfo ForCard(string last4Digits, DateTime expiryDate)
    {
        return new PaymentMethodInfo
        {
            Type = PaymentMethodType.Visa,
            Last4Digits = last4Digits,
            ExpiryDate = expiryDate
        };
    }
    
    public static PaymentMethodInfo ForMoMo(string phoneNumber)
    {
        return new PaymentMethodInfo
        {
            Type = PaymentMethodType.MoMo,
            AccountHolderName = MaskPhoneNumber(phoneNumber)
        };
    }
    
    private static string MaskPhoneNumber(string phone)
    {
        if (phone.Length < 4) return "***";
        return $"***{phone[^4..]}";
    }
}
```

## 3. State Machine Diagrams

### 3.1 Invoice Status State Machine

```
                    ┌─────────┐
                    │  Draft  │
                    └────┬────┘
                         │ Issue()
                         ▼
                    ┌─────────┐
             ┌─────►│ Issued  │◄─────┐
             │      └────┬────┘      │
             │           │            │
             │           │ AddPayment()
             │           ▼            │
             │   ┌──────────────┐    │
             │   │PartiallyPaid │────┘
             │   └──────┬───────┘
             │          │ CompletePayment()
             │          ▼
             │   ┌──────────┐
             └───┤   Paid   │
  Cancel()       └────┬─────┘
                      │ Refund()
                      ▼
                 ┌──────────┐
                 │ Refunded │
                 └──────────┘
                 
  DueDate passed → Overdue
```

### 3.2 PaymentIntent Status State Machine

```
┌─────────┐
│ Created │
└────┬────┘
     │ Authorize()
     ▼
┌──────────────┐         ┌───────────┐
│RequiresAction├────────►│ Cancelled │
└─────┬────────┘ Cancel()└───────────┘
      │ UserAction()              ▲
      ▼                           │
┌────────────┐                    │
│ Processing ├────────────────────┘
└─────┬──────┘     Fail()
      │
      ├──► ┌─────────┐
      │    │ Failed  │
      │    └─────────┘
      │ Success()
      ▼
┌───────────┐
│ Succeeded │
└───────────┘
```

### 3.3 Transaction Status Flow

```
┌─────────┐
│ Pending │
└────┬────┘
     │
     ├──► ┌───────────┐
     │    │ Completed │──┐
     │    └───────────┘  │ Refund()
     │                   ▼
     │              ┌──────────────────┐
     │              │PartiallyRefunded │
     │              └────────┬─────────┘
     │                       │ Full Refund()
     │                       ▼
     │              ┌──────────────┐
     └──────────────┤   Refunded   │
          Fail()    └──────────────┘
                    
     ┌────────┐
     │ Failed │
     └────────┘
```

## 4. Status Transition Rules

### 4.1 Invoice Status Transitions

| From Status | To Status | Trigger | Validation |
|-------------|-----------|---------|------------|
| Draft | Issued | `Issue()` | Must have line items |
| Issued | PartiallyPaid | `AddPayment()` | Payment < Total |
| Issued | Paid | `AddPayment()` | Payment = Remaining |
| PartiallyPaid | Paid | `AddPayment()` | Payment = Remaining |
| Issued | Overdue | Automatic | DueDate < Now |
| PartiallyPaid | Overdue | Automatic | DueDate < Now |
| Any | Cancelled | `Cancel()` | Not Paid/Refunded |
| Paid | Refunded | `ProcessRefund()` | All payments refunded |

### 4.2 PaymentIntent Status Transitions

| From Status | To Status | Trigger | Validation |
|-------------|-----------|---------|------------|
| Created | RequiresAction | `Authorize()` | Valid payment method |
| Created | Processing | `Process()` (Cash) | Direct processing |
| RequiresAction | Processing | `UserAction()` | User completed action |
| RequiresAction | Cancelled | `Cancel()` | Timeout or user cancel |
| Processing | Succeeded | Webhook | Provider confirmation |
| Processing | Failed | Webhook | Provider error |
| Any | Cancelled | `Cancel()` | Before completion |

### 4.3 Transaction Status Transitions

| From Status | To Status | Trigger | Validation |
|-------------|-----------|---------|------------|
| Pending | Completed | Provider Success | Valid external ID |
| Pending | Failed | Provider Error | Error details logged |
| Completed | PartiallyRefunded | `PartialRefund()` | Amount < Original |
| Completed | Refunded | `FullRefund()` | Amount = Original |
| PartiallyRefunded | Refunded | `Refund()` | Total refund = Original |

## 5. Business Rules

### 5.1 Payment Validation Rules

1. **Amount Validation**:
   - Payment amount must be > 0
   - Payment cannot exceed invoice remaining balance
   - Refund cannot exceed original transaction amount

2. **Currency Validation**:
   - All payments for an invoice must use same currency
   - Currency must match invoice currency

3. **Timing Rules**:
   - Payment intent expires after 15 minutes (configurable)
   - Refunds can only be processed within 90 days of payment
   - Webhooks older than 5 minutes are rejected

4. **Status Rules**:
   - Cannot modify completed/cancelled transactions
   - Cannot create payment intent for paid invoice
   - Cannot refund unpaid invoice

### 5.2 Concurrency Rules

1. **Optimistic Locking**: Use RowVersion for concurrent update detection
2. **Idempotency**: Duplicate webhook/API calls return cached response
3. **Transaction Isolation**: Use database transactions for state changes

---

**Next Steps**: Review provider contracts and interfaces.
