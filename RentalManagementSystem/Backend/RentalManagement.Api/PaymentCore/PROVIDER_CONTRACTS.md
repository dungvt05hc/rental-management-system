# Provider Contracts & Core Flows

## 1. Provider Contracts (Interfaces)

### 1.1 IPaymentProvider

```csharp
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

public enum PaymentProviderStatus
{
    Pending,
    Processing,
    Succeeded,
    Failed,
    Cancelled,
    RequiresAction
}
```

### 1.2 IWebhookVerifier

```csharp
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
```

### 1.3 IRefundProvider

```csharp
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

public enum RefundProviderStatus
{
    Pending,
    Succeeded,
    Failed,
    Cancelled
}
```

### 1.4 IReconciliationProvider

```csharp
/// <summary>
/// Handles reconciliation with bank statements and provider reports
/// </summary>
public interface IReconciliationProvider
{
    /// <summary>
    /// Provider name
    /// </summary>
    string ProviderName { get; }
    
    /// <summary>
    /// Fetch transactions for a date range
    /// </summary>
    Task<IReadOnlyCollection<ProviderTransaction>> FetchTransactionsAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Download settlement report
    /// </summary>
    Task<SettlementReport> DownloadSettlementReportAsync(
        DateTime reportDate,
        CancellationToken cancellationToken = default);
}

public record ProviderTransaction(
    string ExternalTransactionId,
    Money Amount,
    DateTime TransactionDate,
    string Status,
    string Type,
    Dictionary<string, string> Metadata);

public record SettlementReport(
    DateTime ReportDate,
    Money TotalAmount,
    int TransactionCount,
    IReadOnlyCollection<SettlementTransaction> Transactions);

public record SettlementTransaction(
    string ExternalTransactionId,
    Money GrossAmount,
    Money Fee,
    Money NetAmount,
    DateTime SettlementDate);
```

### 1.5 IPaymentProviderFactory

```csharp
/// <summary>
/// Factory for creating appropriate payment provider instances
/// </summary>
public interface IPaymentProviderFactory
{
    /// <summary>
    /// Get provider for specific payment method
    /// </summary>
    IPaymentProvider GetProvider(PaymentMethodType methodType);
    
    /// <summary>
    /// Get provider by name
    /// </summary>
    IPaymentProvider GetProviderByName(string providerName);
    
    /// <summary>
    /// Get all registered providers
    /// </summary>
    IReadOnlyCollection<IPaymentProvider> GetAllProviders();
}
```

### 1.6 IIdempotencyService

```csharp
/// <summary>
/// Ensures exactly-once processing of requests
/// </summary>
public interface IIdempotencyService
{
    /// <summary>
    /// Check if request has been processed before
    /// </summary>
    Task<IdempotencyResult> CheckIdempotencyAsync(
        string idempotencyKey,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Store result for idempotent request
    /// </summary>
    Task StoreResultAsync(
        string idempotencyKey,
        object result,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate idempotency key from request data
    /// </summary>
    string GenerateKey(string prefix, params object[] components);
}

public record IdempotencyResult(
    bool IsProcessed,
    object? CachedResult = null);
```

### 1.7 IAuditService

```csharp
/// <summary>
/// Audit logging for compliance and debugging
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Log payment operation
    /// </summary>
    Task LogPaymentOperationAsync(
        string entityType,
        Guid entityId,
        string action,
        object? oldValue,
        object? newValue,
        Guid? userId = null,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query audit logs
    /// </summary>
    Task<IReadOnlyCollection<PaymentAuditLog>> QueryLogsAsync(
        AuditLogQuery query,
        CancellationToken cancellationToken = default);
}

public record AuditLogQuery(
    string? EntityType = null,
    Guid? EntityId = null,
    Guid? UserId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int PageSize = 50,
    int PageNumber = 1);
```

## 2. Core Payment Flows

### 2.1 Flow 1: Create Invoice → Create Payment Intent → Provider Redirect

```
┌──────────┐                                                    ┌─────────────┐
│  Client  │                                                    │   Provider  │
└────┬─────┘                                                    └──────┬──────┘
     │                                                                  │
     │ 1. POST /api/payments/intents                                  │
     ├────────────────────────────────►                                │
     │   { invoiceId, amount, method }                                │
     │                                                                  │
     │                    ┌──────────────────────┐                     │
     │                    │ Payment Orchestrator │                     │
     │                    └──────────┬───────────┘                     │
     │                               │                                  │
     │                    2. Validate invoice                          │
     │                    3. Create PaymentIntent                      │
     │                    4. Select Provider                           │
     │                               │                                  │
     │                               │ 5. CreatePaymentAsync()         │
     │                               ├─────────────────────────────────►
     │                               │                                  │
     │                               │ 6. Return redirect URL/QR       │
     │                               ◄─────────────────────────────────┤
     │                               │                                  │
     │                    7. Save transaction                          │
     │                    8. Update intent status                      │
     │                               │                                  │
     │ 9. Return { redirectUrl, qr } │                                  │
     ◄────────────────────────────────                                  │
     │                                                                  │
     │ 10. Redirect to provider                                        │
     ├──────────────────────────────────────────────────────────────────►
     │                                                                  │
     │ 11. User completes payment                                      │
     │                                                                  │
```

### 2.2 Flow 2: Provider Callback/Webhook → Update Payment Status

```
┌─────────────┐                                              ┌──────────────┐
│   Provider  │                                              │  Our System  │
└──────┬──────┘                                              └──────┬───────┘
       │                                                             │
       │ 1. POST /api/webhooks/{provider}                           │
       ├─────────────────────────────────────────────────────────────►
       │   Headers: X-Signature                                     │
       │   Body: { transactionId, status, ... }                     │
       │                                                             │
       │                               ┌────────────────────┐       │
       │                               │ Webhook Processor  │       │
       │                               └─────────┬──────────┘       │
       │                                         │                   │
       │                        2. Verify signature                 │
       │                        3. Check idempotency                │
       │                        4. Parse payload                    │
       │                                         │                   │
       │                        5. Find transaction                 │
       │                        6. Update status                    │
       │                        7. Update invoice                   │
       │                        8. Emit domain events               │
       │                        9. Log to audit                     │
       │                                         │                   │
       │ 10. HTTP 200 OK                        │                   │
       ◄─────────────────────────────────────────────────────────────┤
       │   { received: true }                                        │
       │                                                             │
       │                               ┌────────────────────┐       │
       │                               │  Outbox Processor  │       │
       │                               └─────────┬──────────┘       │
       │                                         │                   │
       │                        11. Send notifications              │
       │                        12. Update analytics                │
       │                        13. Trigger reconciliation          │
       │                                         │                   │
```

### 2.3 Flow 3: Manual Cash Payment Posting

```
┌──────────┐                                              ┌──────────────┐
│  Staff   │                                              │    System    │
└────┬─────┘                                              └──────┬───────┘
     │                                                            │
     │ 1. POST /api/payments/cash                                │
     ├────────────────────────────────────────────────────────────►
     │   { invoiceId, amount, receiptNumber }                    │
     │   Headers: Authorization: Bearer {token}                  │
     │                                                            │
     │                         ┌────────────────────────┐        │
     │                         │ Cash Payment Handler   │        │
     │                         └───────────┬────────────┘        │
     │                                     │                      │
     │                      2. Validate invoice exists           │
     │                      3. Verify amount                     │
     │                      4. Check permissions                 │
     │                                     │                      │
     │                      5. Create PaymentIntent (Cash)       │
     │                      6. Mark as Processing                │
     │                      7. Create Transaction                │
     │                      8. Mark as Completed                 │
     │                      9. Update invoice status             │
     │                     10. Generate receipt                  │
     │                     11. Log to audit                      │
     │                                     │                      │
     │ 12. Return { paymentId, receipt }  │                      │
     ◄────────────────────────────────────────────────────────────┤
     │                                                            │
```

### 2.4 Flow 4: Refund Processing

```
┌──────────┐                                              ┌─────────────┐
│  Staff   │                                              │   Provider  │
└────┬─────┘                                              └──────┬──────┘
     │                                                            │
     │ 1. POST /api/refunds                                      │
     ├────────────────────────────────►                          │
     │   { transactionId, amount, reason }                       │
     │                                                            │
     │             ┌────────────────────────┐                    │
     │             │  Refund Orchestrator   │                    │
     │             └──────────┬─────────────┘                    │
     │                        │                                   │
     │         2. Validate transaction                           │
     │         3. Check refund eligibility                       │
     │         4. Verify amount <= original                      │
     │         5. Check refund window (90 days)                  │
     │                        │                                   │
     │         6. Create Refund entity                           │
     │         7. Select provider                                │
     │                        │                                   │
     │                        │ 8. CreateRefundAsync()           │
     │                        ├───────────────────────────────────►
     │                        │                                   │
     │                        │ 9. Return refund result          │
     │                        ◄───────────────────────────────────┤
     │                        │                                   │
     │        10. Update refund status                           │
     │        11. Update transaction                             │
     │        12. Update invoice if fully refunded               │
     │        13. Log to audit                                   │
     │                        │                                   │
     │ 14. Return refund result                                  │
     ◄────────────────────────                                   │
     │                                                            │
```

### 2.5 Flow 5: Reconciliation (Bank Statement / Provider Query)

```
┌─────────────────┐                                      ┌─────────────┐
│ Scheduled Job   │                                      │   Provider  │
└────────┬────────┘                                      └──────┬──────┘
         │                                                      │
         │ 1. Trigger: Daily @ 2:00 AM                         │
         │                                                      │
         │        ┌──────────────────────────┐                 │
         │        │ Reconciliation Service   │                 │
         │        └────────────┬─────────────┘                 │
         │                     │                                │
         │     2. Fetch date range (yesterday)                 │
         │                     │                                │
         │                     │ 3. FetchTransactionsAsync()   │
         │                     ├────────────────────────────────►
         │                     │                                │
         │                     │ 4. Return transactions        │
         │                     ◄────────────────────────────────┤
         │                     │                                │
         │     5. Query our transactions (same period)         │
         │     6. Match by external ID                         │
         │     7. Compare amounts                              │
         │                     │                                │
         │     For each mismatch:                              │
         │     8. Log discrepancy                              │
         │     9. Create reconciliation report                 │
         │    10. Send alert to finance team                   │
         │                     │                                │
         │    11. Update reconciliation status                 │
         │    12. Store report                                 │
         │                     │                                │
```

## 3. Error Handling Flows

### 3.1 Provider Timeout Handling

```csharp
// Configured in Infrastructure layer
var retryPolicy = Policy
    .Handle<HttpRequestException>()
    .Or<TimeoutException>()
    .WaitAndRetryAsync(
        retryCount: 3,
        sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            _logger.LogWarning(
                "Retry {RetryCount} after {Delay}s due to {Exception}",
                retryCount, timeSpan.TotalSeconds, exception.Message);
        });

var timeoutPolicy = Policy
    .TimeoutAsync(TimeSpan.FromSeconds(30));

var circuitBreakerPolicy = Policy
    .Handle<HttpRequestException>()
    .CircuitBreakerAsync(
        exceptionsAllowedBeforeBreaking: 5,
        durationOfBreak: TimeSpan.FromMinutes(1),
        onBreak: (exception, duration) =>
        {
            _logger.LogError("Circuit breaker opened for {Duration}", duration);
        },
        onReset: () =>
        {
            _logger.LogInformation("Circuit breaker reset");
        });

// Combine policies
var policyWrap = Policy.WrapAsync(retryPolicy, circuitBreakerPolicy, timeoutPolicy);
```

### 3.2 Provider Error Normalization

```csharp
/// <summary>
/// Normalizes provider-specific errors into standard error codes
/// </summary>
public class ProviderErrorNormalizer
{
    public StandardErrorCode Normalize(string providerName, string providerErrorCode)
    {
        return providerName switch
        {
            "MoMo" => NormalizeMoMoError(providerErrorCode),
            "Visa" => NormalizeVisaError(providerErrorCode),
            "PayPal" => NormalizePayPalError(providerErrorCode),
            _ => StandardErrorCode.UnknownError
        };
    }
    
    private StandardErrorCode NormalizeMoMoError(string errorCode)
    {
        return errorCode switch
        {
            "9" => StandardErrorCode.InsufficientFunds,
            "10" => StandardErrorCode.InvalidAccount,
            "11" => StandardErrorCode.TransactionTimeout,
            "1001" => StandardErrorCode.InvalidAmount,
            _ => StandardErrorCode.ProviderError
        };
    }
}

public enum StandardErrorCode
{
    Success,
    InsufficientFunds,
    InvalidAccount,
    InvalidAmount,
    TransactionTimeout,
    DuplicateTransaction,
    ProviderError,
    NetworkError,
    UnknownError
}
```

## 4. Sequence Diagrams

### 4.1 Complete Payment Flow (Success Path)

```
Client    API    Orchestrator    Provider    Webhook    Database
  │        │           │             │           │           │
  │──1────►│           │             │           │           │
  │        │──2───────►│             │           │           │
  │        │           │──3─────────────────────►│           │
  │        │           │             │           │           │
  │        │           │◄──4─────────────────────┤           │
  │        │           │──5─────────────────────────────────►│
  │        │◄──6───────┤             │           │           │
  │◄──7────┤           │             │           │           │
  │        │           │             │           │           │
  │──8─────────────────────────────►│ (User pays)           │
  │        │           │             │           │           │
  │        │           │             │──9───────►│           │
  │        │           │             │           │──10──────►│
  │        │           │             │           │◄──11──────┤
  │        │           │             │◄──12──────┤           │
  │◄──13───────────────────────────┤ (Redirect) │           │
  │        │           │             │           │           │

1. Create Payment Intent
2. Orchestrate Payment
3. Call Provider API
4. Return Redirect URL
5. Save Transaction
6. Return Response
7. Show Redirect
8. User Redirects & Pays
9. Provider Webhook
10. Update Database
11. Confirm Update
12. Ack Webhook
13. Return to App
```

---

**Next Steps**: Database schema and persistence layer implementation.
