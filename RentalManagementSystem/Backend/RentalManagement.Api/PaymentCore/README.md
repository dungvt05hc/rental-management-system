# Payment Core - Complete Implementation Guide

## Quick Start

This Payment Core provides a **production-ready, provider-agnostic payment orchestration system** for your rental management application.

### Features

✅ **Provider Agnostic**: Pluggable architecture for any payment gateway  
✅ **Idempotent**: Exactly-once processing for webhooks and API calls  
✅ **Secure**: Webhook signature verification, secret management, audit trails  
✅ **Resilient**: Retry logic, circuit breakers, timeout handling  
✅ **Compliant**: PCI-DSS considerations, audit logs, data retention  
✅ **Scalable**: Stateless design, horizontal scaling, background jobs  

## Architecture

```
PaymentCore/
├── Domain/              # Business logic & entities
│   ├── Entities/       # Invoice, PaymentIntent, Transaction, Refund
│   ├── ValueObjects/   # Money, PaymentMethodInfo
│   ├── Enums/          # Status enums
│   └── Contracts/      # IPaymentProvider, IWebhookVerifier, etc.
├── Application/         # Use cases & orchestration
│   ├── Services/       # PaymentOrchestrator, RefundOrchestrator
│   ├── Commands/       # CreatePaymentIntent, ProcessRefund
│   └── Queries/        # GetPaymentStatus, GetReconciliationReport
├── Infrastructure/      # External integrations
│   ├── Providers/      # MoMo, Visa, PayPal, BankX implementations
│   ├── Persistence/    # Repositories, EF Core configurations
│   └── Resilience/     # Polly policies, circuit breakers
└── Presentation/        # API endpoints
    ├── Endpoints/      # Minimal API endpoints
    └── DTOs/           # Request/Response objects
```

## Implementation Checklist

### Phase 1: Core Domain ✅
- [x] Domain entities (Invoice, PaymentIntent, Transaction, Refund)
- [x] Value objects (Money, PaymentMethodInfo)
- [x] Provider contracts (interfaces)
- [x] State machines and business rules

### Phase 2: Infrastructure 🚧
- [ ] Database migrations
- [ ] EF Core configurations
- [ ] Provider implementations (MoMo, BankX, Cash)
- [ ] Webhook verifiers
- [ ] Idempotency service
- [ ] Audit service

### Phase 3: Application Layer 🚧
- [ ] Payment orchestrator
- [ ] Refund orchestrator
- [ ] Webhook processor
- [ ] Reconciliation service

### Phase 4: Presentation Layer 🚧
- [ ] Minimal API endpoints
- [ ] DTOs and validators
- [ ] Authentication/Authorization
- [ ] Error handling middleware

### Phase 5: Testing & Deployment 📋
- [ ] Unit tests
- [ ] Integration tests
- [ ] Provider sandbox testing
- [ ] Production deployment

## Getting Started

### 1. Install Required NuGet Packages

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api

# Core packages
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Polly
dotnet add package FluentValidation.AspNetCore

# Security
dotnet add package Azure.Security.KeyVault.Secrets
dotnet add package Azure.Identity

# Background jobs (optional)
dotnet add package Hangfire.AspNetCore
dotnet add package Hangfire.SqlServer

# Testing
dotnet add package xUnit
dotnet add package Moq
dotnet add package FluentAssertions
```

### 2. Configure appsettings.json

```json
{
  "PaymentCore": {
    "DefaultCurrency": "VND",
    "PaymentIntentExpiryMinutes": 15,
    "RefundWindowDays": 90,
    "IdempotencyTtlHours": 24,
    "Providers": {
      "MoMo": {
        "Enabled": true,
        "BaseUrl": "https://test-payment.momo.vn",
        "PartnerCode": "stored-in-keyvault",
        "AccessKey": "stored-in-keyvault",
        "SecretKey": "stored-in-keyvault",
        "TimeoutSeconds": 30
      },
      "BankX": {
        "Enabled": true,
        "BaseUrl": "https://api.bankx.example.com",
        "ApiKey": "stored-in-keyvault",
        "TimeoutSeconds": 30
      }
    },
    "Resilience": {
      "RetryCount": 3,
      "CircuitBreakerThreshold": 5,
      "CircuitBreakerDurationSeconds": 60,
      "TimeoutSeconds": 30
    }
  },
  "AzureKeyVault": {
    "VaultUri": "https://your-keyvault.vault.azure.net/"
  }
}
```

### 3. Run Database Migrations

```bash
# Create initial migration
dotnet ef migrations add AddPaymentCore --project RentalManagement.Api

# Apply migration
dotnet ef database update --project RentalManagement.Api
```

### 4. Register Services in Program.cs

```csharp
// Add Payment Core services
builder.Services.AddPaymentCore(builder.Configuration);

// Or manually:
builder.Services.AddScoped<IPaymentOrchestrator, PaymentOrchestrator>();
builder.Services.AddScoped<IRefundOrchestrator, RefundOrchestrator>();
builder.Services.AddScoped<IWebhookProcessor, WebhookProcessor>();
builder.Services.AddScoped<IIdempotencyService, IdempotencyService>();
builder.Services.AddScoped<IAuditService, AuditService>();

// Register providers
builder.Services.AddScoped<IPaymentProvider, MoMoProvider>();
builder.Services.AddScoped<IPaymentProvider, CashProvider>();
builder.Services.AddScoped<IPaymentProviderFactory, PaymentProviderFactory>();
```

## Usage Examples

### Example 1: Create Payment Intent (Online Payment)

```csharp
POST /api/payments/intents
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 500000,
  "currency": "VND",
  "paymentMethod": "MoMo",
  "returnUrl": "https://yourapp.com/payment/success",
  "cancelUrl": "https://yourapp.com/payment/cancel"
}

Response 201:
{
  "paymentIntentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "RequiresAction",
  "redirectUrl": "https://payment.momo.vn/gw_payment/...",
  "qrCodeData": "00020101021238570010A000000727...",
  "expiresAt": "2026-01-06T10:30:00Z"
}
```

### Example 2: Record Cash Payment

```csharp
POST /api/payments/cash
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 500000,
  "currency": "VND",
  "receiptNumber": "CASH-2026-001",
  "notes": "Paid in full by tenant"
}

Response 201:
{
  "paymentIntentId": "8d9e7780-8536-41ef-a55c-f18fd2f91bf8",
  "status": "Succeeded",
  "receiptUrl": "https://yourapp.com/receipts/CASH-2026-001.pdf"
}
```

### Example 3: Process Refund

```csharp
POST /api/refunds
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": "9e0e8881-9647-42fg-b66d-g29ge3g02cg9",
  "amount": 500000,
  "reason": "RequestedByCustomer",
  "reasonDescription": "Duplicate payment"
}

Response 201:
{
  "refundId": "ae1e9992-a758-53hg-c77e-h3ahf4h13dha",
  "status": "Pending",
  "estimatedCompletionDate": "2026-01-13T00:00:00Z"
}
```

### Example 4: Query Payment Status

```csharp
GET /api/payments/intents/7c9e6679-7425-40de-944b-e07fc1f90ae7
Authorization: Bearer {token}

Response 200:
{
  "paymentIntentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "invoiceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Succeeded",
  "amount": 500000,
  "currency": "VND",
  "paymentMethod": "MoMo",
  "createdAt": "2026-01-06T10:15:00Z",
  "completedAt": "2026-01-06T10:17:32Z",
  "transaction": {
    "externalTransactionId": "2026010610173201",
    "providerName": "MoMo"
  }
}
```

### Example 5: Webhook Handling (Provider → Your System)

```csharp
POST /api/webhooks/momo
Headers:
  X-Signature: abc123def456...
  Content-Type: application/json

Body:
{
  "partnerCode": "MOMO123",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "requestId": "2026010610173201",
  "amount": 500000,
  "orderInfo": "Payment for invoice INV-2026-001",
  "resultCode": 0,
  "message": "Successful",
  "payType": "qr",
  "transId": "2026010610173201",
  "signature": "abc123def456..."
}

Response 200:
{
  "received": true,
  "timestamp": "2026-01-06T10:17:35Z"
}
```

## Security Best Practices

### 1. Webhook Signature Verification

Each provider has its own signature algorithm. **Never process webhooks without verification!**

```csharp
// MoMo uses HMAC-SHA256
var signature = ComputeHmacSha256(rawData, secretKey);
if (signature != providedSignature)
{
    return Unauthorized();
}
```

### 2. Secret Storage

**❌ NEVER store secrets in appsettings.json or code!**

```csharp
// ✅ Use Azure Key Vault
var client = new SecretClient(
    new Uri(configuration["AzureKeyVault:VaultUri"]),
    new DefaultAzureCredential());

var secret = await client.GetSecretAsync("MoMo-SecretKey");
```

### 3. PCI Compliance

**❌ NEVER store:**
- Full credit card numbers
- CVV codes
- Card PINs

**✅ DO store:**
- Last 4 digits only
- Provider-issued tokens
- Expiry dates (optional)

### 4. Audit Logging

Log **every** payment operation for compliance:

```csharp
await _auditService.LogPaymentOperationAsync(
    entityType: "PaymentIntent",
    entityId: paymentIntent.Id,
    action: "StatusChanged",
    oldValue: oldStatus,
    newValue: newStatus,
    userId: currentUserId
);
```

## Error Handling

### Standard Error Response

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Payment Failed",
  "status": 400,
  "detail": "Insufficient funds in MoMo wallet",
  "instance": "/api/payments/intents",
  "traceId": "00-abc123-def456-00",
  "errors": {
    "PaymentProvider": ["MoMo returned error code: 9"]
  }
}
```

### Provider Error Codes

| Provider | Error Code | Standard Code | Meaning |
|----------|-----------|---------------|---------|
| MoMo | 9 | InsufficientFunds | Not enough balance |
| MoMo | 10 | InvalidAccount | Account doesn't exist |
| MoMo | 11 | TransactionTimeout | Payment timed out |
| MoMo | 1001 | InvalidAmount | Invalid payment amount |

## Testing

### Unit Tests Example

```csharp
[Fact]
public async Task CreatePaymentIntent_ValidRequest_ReturnsPaymentIntent()
{
    // Arrange
    var mockProvider = new Mock<IPaymentProvider>();
    mockProvider
        .Setup(p => p.CreatePaymentAsync(It.IsAny<CreatePaymentRequest>(), default))
        .ReturnsAsync(new PaymentProviderResult(
            Success: true,
            ExternalTransactionId: "EXT123",
            RedirectUrl: "https://payment.momo.vn/...",
            QrCodeData: null,
            Status: PaymentProviderStatus.RequiresAction));
    
    var orchestrator = new PaymentOrchestrator(
        mockProvider.Object,
        _repository,
        _auditService);
    
    // Act
    var result = await orchestrator.CreatePaymentIntentAsync(request);
    
    // Assert
    result.Should().NotBeNull();
    result.Status.Should().Be(PaymentIntentStatus.RequiresAction);
    result.RedirectUrl.Should().NotBeNullOrEmpty();
}
```

### Integration Tests with Test Containers

```csharp
public class PaymentIntegrationTests : IAsyncLifetime
{
    private readonly MsSqlContainer _dbContainer = new MsSqlBuilder().Build();
    
    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        // Run migrations
    }
    
    [Fact]
    public async Task EndToEnd_PaymentFlow_Success()
    {
        // Test complete flow: create → process → webhook → verify
    }
}
```

## Monitoring & Observability

### Key Metrics to Track

1. **Payment Success Rate**: `payments_succeeded / total_payments`
2. **Average Processing Time**: Time from intent creation to completion
3. **Provider Availability**: Uptime per provider
4. **Webhook Processing Time**: Should be < 100ms
5. **Reconciliation Discrepancies**: Mismatched transactions count

### Logging Example

```csharp
_logger.LogInformation(
    "Payment intent created: {PaymentIntentId} for invoice {InvoiceId} via {Provider}",
    paymentIntent.Id,
    invoiceId,
    providerName);

_logger.LogWarning(
    "Payment failed: {PaymentIntentId} - {ErrorCode}: {ErrorMessage}",
    paymentIntent.Id,
    errorCode,
    errorMessage);
```

## Production Deployment Checklist

- [ ] Configure Azure Key Vault with secrets
- [ ] Set up connection strings in Azure App Service
- [ ] Configure provider webhook URLs (must be HTTPS)
- [ ] Enable Application Insights for monitoring
- [ ] Set up alerts for payment failures
- [ ] Configure Hangfire for background jobs
- [ ] Test webhook signature verification
- [ ] Run smoke tests on production
- [ ] Document runbook for payment issues
- [ ] Train support team on refund procedures

## Troubleshooting

### Issue: Webhooks not received

1. Check provider webhook configuration (correct URL?)
2. Verify firewall allows provider IPs
3. Check webhook endpoint returns 200 within 5 seconds
4. Review Application Insights for errors

### Issue: Payment stuck in "Processing"

1. Query provider API for actual status
2. Check if webhook was received (idempotency table)
3. Manually reconcile if needed
4. Implement retry logic for status queries

### Issue: Duplicate payments

1. Verify idempotency keys are unique
2. Check for race conditions in webhook processing
3. Review database transaction isolation level
4. Check for duplicate webhook deliveries

## Support & Contributions

For issues or questions, please refer to:
- **Architecture**: `ARCHITECTURE.md`
- **Domain Models**: `DOMAIN_MODELS.md`
- **Provider Contracts**: `PROVIDER_CONTRACTS.md`
- **Database Schema**: `DATABASE_SCHEMA.md`

## License

This Payment Core is part of the Rental Management System.

---

**Ready to implement?** Start with Phase 2 by running the database migrations and implementing the MoMo provider!
