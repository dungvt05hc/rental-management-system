# Payment Core Architecture

## Overview
Provider-agnostic payment orchestration layer with pluggable adapter architecture for rental management system.

## Architecture Style: Clean Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Minimal APIs    │  │  Webhook Handler │  │  Controllers │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Payment Orchestration Service                            │   │
│  │  • CreatePaymentIntent  • ProcessWebhook                  │   │
│  │  • RecordCashPayment    • ProcessRefund                   │   │
│  │  • ReconcilePayments    • QueryPaymentStatus              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐   │
│  │  Idempotency Svc │  │  Webhook Dedup   │  │  Audit Log  │   │
│  └──────────────────┘  └──────────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                          Domain Layer                            │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐    │
│  │   Invoice    │  │ PaymentIntent  │  │ PaymentTransaction│   │
│  └──────────────┘  └────────────────┘  └──────────────────┘    │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐    │
│  │    Refund    │  │ PaymentMethod  │  │   Domain Events   │   │
│  └──────────────┘  └────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Payment Provider Adapters                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │    │
│  │  │   MoMo   │  │   Visa   │  │  PayPal  │  │ Bank X  │ │    │
│  │  │ Provider │  │ Provider │  │ Provider │  │ Provider│ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │    │
│  │  ┌──────────┐  ┌──────────┐                             │    │
│  │  │   Cash   │  │   Bank Y │                             │    │
│  │  │ Provider │  │ Provider │                             │    │
│  │  └──────────┘  └──────────┘                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │  PostgreSQL  │  │  Secret Mgr  │  │  Outbox Pattern  │      │
│  │  Repository  │  │  (Azure KV)  │  │  Publisher       │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Domain Layer (Core Business Logic)
**Pure business logic - no dependencies on external frameworks**

- **Entities**: Invoice, PaymentIntent, PaymentTransaction, Refund, PaymentMethod
- **Value Objects**: Money, PaymentReference, ProviderMetadata
- **Enums**: PaymentStatus, TransactionType, RefundStatus
- **Domain Events**: PaymentCompletedEvent, RefundProcessedEvent
- **Business Rules**: State transitions, validation logic

### 2. Application Layer (Use Cases)
**Orchestrates domain logic and coordinates infrastructure**

- **Services**:
  - `PaymentOrchestrationService`: Main payment workflows
  - `IdempotencyService`: Deduplication and idempotency key management
  - `WebhookProcessingService`: Webhook validation and processing
  - `ReconciliationService`: Payment reconciliation with provider data
  
- **Interfaces** (contracts for infrastructure):
  - `IPaymentProvider`
  - `IWebhookVerifier`
  - `IRefundProvider`
  - `IReconciliationProvider`
  - `IPaymentRepository`
  - `IIdempotencyRepository`

### 3. Infrastructure Layer (External Concerns)
**Implements application interfaces with concrete technologies**

- **Provider Adapters**:
  - MoMoPaymentProvider
  - VisaPaymentProvider
  - PayPalPaymentProvider
  - BankXPaymentProvider
  - CashPaymentProvider (offline)
  
- **Persistence**: EF Core repositories
- **Security**: Webhook signature verification, secret management
- **Resilience**: Polly policies (retry, circuit breaker, timeout)
- **Outbox Pattern**: Reliable event publishing

### 4. Presentation Layer (API)
**Minimal API endpoints and controllers**

- Payment initiation endpoints
- Webhook receivers
- Status query endpoints
- Cash payment recording
- Refund endpoints

## Key Design Patterns

### 1. **Adapter Pattern**
Each payment provider implements common interfaces, allowing seamless integration of new providers.

### 2. **Strategy Pattern**
Provider selection based on payment method and configuration.

### 3. **Outbox Pattern**
Ensures exactly-once event publishing for downstream systems.

### 4. **Repository Pattern**
Abstracts data access with clean interfaces.

### 5. **Circuit Breaker Pattern**
Protects against cascading failures when providers are down.

## Data Flow Diagrams

### Online Payment Flow
```
User/System → Create Invoice
              ↓
        Create PaymentIntent (idempotency key)
              ↓
        Select Provider (MoMo/Visa/PayPal/Bank)
              ↓
        Provider.InitiatePayment()
              ↓
        Return Redirect URL / QR Code
              ↓
        User completes payment on provider site
              ↓
        Provider → Webhook Callback
              ↓
        Verify Signature → Dedup Check → Process
              ↓
        Update PaymentTransaction & PaymentIntent
              ↓
        Update Invoice Status
              ↓
        Publish PaymentCompletedEvent (Outbox)
```

### Cash Payment Flow
```
User/Admin → Record Cash Payment
              ↓
        Validate Invoice & Amount
              ↓
        Create PaymentTransaction (Cash)
              ↓
        Update Invoice Status
              ↓
        Create Audit Log
              ↓
        Publish PaymentCompletedEvent
```

### Refund Flow
```
Admin → Request Refund
        ↓
    Validate Payment & Amount
        ↓
    Check Provider Supports Refund
        ↓
    Provider.ProcessRefund()
        ↓
    Create Refund Record
        ↓
    Update PaymentTransaction
        ↓
    Update Invoice
        ↓
    Publish RefundProcessedEvent
```

## Security Architecture

### Webhook Security
1. **Signature Verification**: Each provider implements signature verification
2. **Timestamp Validation**: Reject old webhooks (5-minute window)
3. **IP Whitelisting**: Optional IP-based filtering
4. **HTTPS Only**: All webhook endpoints require HTTPS

### Secret Management
- Provider API keys stored in Azure Key Vault / AWS Secrets Manager
- Secrets never logged or exposed in responses
- Rotation support via configuration

### PCI Compliance
- **No card data storage**: Never store CVV, full PAN
- **Tokenization**: Use provider tokens for recurring payments
- **Audit Trails**: All payment actions logged with user context

## Error Handling Strategy

### Retry Policy (Transient Failures)
```
Retry 3 times with exponential backoff:
- 1st retry: 2 seconds
- 2nd retry: 4 seconds
- 3rd retry: 8 seconds
```

### Circuit Breaker (Provider Outages)
```
Failure threshold: 50% of requests in 30-second window
Open duration: 60 seconds
Half-open test: 1 request
```

### Timeout Policy
- Provider API calls: 30 seconds
- Webhook processing: 10 seconds
- Database operations: 5 seconds

### Error Normalization
All provider errors mapped to standard error codes:
- `PROVIDER_TIMEOUT`
- `PROVIDER_UNAVAILABLE`
- `INVALID_CREDENTIALS`
- `INSUFFICIENT_FUNDS`
- `PAYMENT_DECLINED`
- `INVALID_REQUEST`

## Database Strategy

### Tables
1. **Invoices** (existing)
2. **PaymentIntents**
3. **PaymentTransactions**
4. **Refunds**
5. **PaymentMethods**
6. **IdempotencyKeys**
7. **WebhookEvents**
8. **OutboxMessages**
9. **AuditLogs**

### Indexes
- PaymentIntent: `(InvoiceId, Status)`
- PaymentTransaction: `(PaymentIntentId, CreatedAt)`
- IdempotencyKeys: `(Key, CreatedAt)` - unique
- WebhookEvents: `(ProviderId, EventId)` - unique
- OutboxMessages: `(ProcessedAt, CreatedAt)`

## Scalability Considerations

1. **Horizontal Scaling**: Stateless API design
2. **Background Processing**: Webhook queue with workers
3. **Database Sharding**: Future: shard by tenant or date
4. **Caching**: Provider configuration, payment method metadata
5. **Rate Limiting**: Per-provider rate limits with sliding window

## Monitoring & Observability

### Metrics
- Payment success rate by provider
- Average payment processing time
- Webhook processing latency
- Provider availability
- Refund success rate

### Logging
- Structured logging with correlation IDs
- Payment state transitions
- Provider API calls (sanitized)
- Webhook processing events

### Alerts
- Provider downtime > 5 minutes
- Payment success rate < 95%
- Webhook processing errors > 10/minute
- Unprocessed outbox messages > 100
