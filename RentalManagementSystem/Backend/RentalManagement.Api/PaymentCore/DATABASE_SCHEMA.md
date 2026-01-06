# Database Schema & Persistence

## 1. Database Tables

### 1.1 PaymentIntents Table

```sql
CREATE TABLE PaymentIntents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    InvoiceId UNIQUEIDENTIFIER NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Currency VARCHAR(3) NOT NULL,
    MethodType INT NOT NULL,
    Status INT NOT NULL,
    ClientSecret VARCHAR(255),
    RedirectUrl VARCHAR(2000),
    QrCodeData VARCHAR(2000),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2,
    CompletedAt DATETIME2,
    CancellationReason VARCHAR(500),
    ErrorCode VARCHAR(50),
    ErrorMessage VARCHAR(1000),
    RowVersion ROWVERSION NOT NULL,
    
    CONSTRAINT FK_PaymentIntents_Invoices FOREIGN KEY (InvoiceId) 
        REFERENCES Invoices(Id) ON DELETE CASCADE,
    
    INDEX IX_PaymentIntents_InvoiceId (InvoiceId),
    INDEX IX_PaymentIntents_Status (Status),
    INDEX IX_PaymentIntents_CreatedAt (CreatedAt DESC),
    INDEX IX_PaymentIntents_ExpiresAt (ExpiresAt) 
        WHERE ExpiresAt IS NOT NULL AND Status IN (0, 1)
);
```

### 1.2 PaymentTransactions Table

```sql
CREATE TABLE PaymentTransactions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PaymentIntentId UNIQUEIDENTIFIER NOT NULL,
    ProviderName VARCHAR(50) NOT NULL,
    ExternalTransactionId VARCHAR(255),
    Amount DECIMAL(18,2) NOT NULL,
    Currency VARCHAR(3) NOT NULL,
    Status INT NOT NULL,
    Type INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ProcessedAt DATETIME2,
    ProviderResponse NVARCHAR(MAX),
    ErrorCode VARCHAR(50),
    ErrorMessage VARCHAR(1000),
    IdempotencyKey VARCHAR(255) NOT NULL,
    Metadata NVARCHAR(MAX),
    
    CONSTRAINT FK_PaymentTransactions_PaymentIntents FOREIGN KEY (PaymentIntentId) 
        REFERENCES PaymentIntents(Id) ON DELETE CASCADE,
    
    CONSTRAINT UQ_PaymentTransactions_IdempotencyKey UNIQUE (IdempotencyKey),
    
    INDEX IX_PaymentTransactions_PaymentIntentId (PaymentIntentId),
    INDEX IX_PaymentTransactions_ExternalId (ExternalTransactionId),
    INDEX IX_PaymentTransactions_Status (Status),
    INDEX IX_PaymentTransactions_ProviderName (ProviderName),
    INDEX IX_PaymentTransactions_CreatedAt (CreatedAt DESC)
);
```

### 1.3 Refunds Table

```sql
CREATE TABLE Refunds (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PaymentTransactionId UNIQUEIDENTIFIER NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Currency VARCHAR(3) NOT NULL,
    Reason INT NOT NULL,
    ReasonDescription VARCHAR(1000),
    Status INT NOT NULL,
    ExternalRefundId VARCHAR(255),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ProcessedAt DATETIME2,
    CreatedByUserId UNIQUEIDENTIFIER NOT NULL,
    ProviderResponse NVARCHAR(MAX),
    ErrorCode VARCHAR(50),
    ErrorMessage VARCHAR(1000),
    IdempotencyKey VARCHAR(255) NOT NULL,
    
    CONSTRAINT FK_Refunds_PaymentTransactions FOREIGN KEY (PaymentTransactionId) 
        REFERENCES PaymentTransactions(Id) ON DELETE CASCADE,
    
    CONSTRAINT UQ_Refunds_IdempotencyKey UNIQUE (IdempotencyKey),
    
    INDEX IX_Refunds_PaymentTransactionId (PaymentTransactionId),
    INDEX IX_Refunds_ExternalRefundId (ExternalRefundId),
    INDEX IX_Refunds_Status (Status),
    INDEX IX_Refunds_CreatedByUserId (CreatedByUserId),
    INDEX IX_Refunds_CreatedAt (CreatedAt DESC)
);
```

### 1.4 IdempotencyRecords Table

```sql
CREATE TABLE IdempotencyRecords (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    IdempotencyKey VARCHAR(255) NOT NULL,
    RequestHash VARCHAR(64) NOT NULL,
    ResponseData NVARCHAR(MAX),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    
    CONSTRAINT UQ_IdempotencyRecords_Key UNIQUE (IdempotencyKey),
    
    INDEX IX_IdempotencyRecords_ExpiresAt (ExpiresAt),
    INDEX IX_IdempotencyRecords_CreatedAt (CreatedAt DESC)
);
```

### 1.5 PaymentAuditLogs Table

```sql
CREATE TABLE PaymentAuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EntityType VARCHAR(100) NOT NULL,
    EntityId UNIQUEIDENTIFIER NOT NULL,
    Action VARCHAR(100) NOT NULL,
    OldValue NVARCHAR(MAX),
    NewValue NVARCHAR(MAX),
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UserId UNIQUEIDENTIFIER,
    IpAddress VARCHAR(45),
    UserAgent VARCHAR(500),
    CorrelationId VARCHAR(100) NOT NULL,
    
    INDEX IX_PaymentAuditLogs_EntityType_EntityId (EntityType, EntityId),
    INDEX IX_PaymentAuditLogs_UserId (UserId),
    INDEX IX_PaymentAuditLogs_Timestamp (Timestamp DESC),
    INDEX IX_PaymentAuditLogs_CorrelationId (CorrelationId)
);
```

### 1.6 OutboxMessages Table

```sql
CREATE TABLE OutboxMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    MessageType VARCHAR(255) NOT NULL,
    Payload NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ProcessedAt DATETIME2,
    FailureCount INT NOT NULL DEFAULT 0,
    LastError VARCHAR(2000),
    
    INDEX IX_OutboxMessages_ProcessedAt (ProcessedAt) 
        WHERE ProcessedAt IS NULL,
    INDEX IX_OutboxMessages_CreatedAt (CreatedAt DESC)
);
```

### 1.7 ReconciliationReports Table

```sql
CREATE TABLE ReconciliationReports (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ProviderName VARCHAR(50) NOT NULL,
    ReportDate DATE NOT NULL,
    FromDate DATE NOT NULL,
    ToDate DATE NOT NULL,
    TotalTransactions INT NOT NULL,
    MatchedTransactions INT NOT NULL,
    MismatchedTransactions INT NOT NULL,
    MissingInProvider INT NOT NULL,
    MissingInSystem INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    ReportData NVARCHAR(MAX),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    INDEX IX_ReconciliationReports_ProviderName_ReportDate (ProviderName, ReportDate DESC),
    INDEX IX_ReconciliationReports_CreatedAt (CreatedAt DESC)
);
```

### 1.8 Update Invoices Table

```sql
-- Add payment-related columns to existing Invoices table
ALTER TABLE Invoices ADD 
    Currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    RowVersion ROWVERSION NOT NULL;

CREATE INDEX IX_Invoices_Status ON Invoices(Status);
CREATE INDEX IX_Invoices_DueDate ON Invoices(DueDate);
```

## 2. EF Core Entity Configurations

### 2.1 PaymentIntentConfiguration

```csharp
public class PaymentIntentConfiguration : IEntityTypeConfiguration<PaymentIntent>
{
    public void Configure(EntityTypeBuilder<PaymentIntent> builder)
    {
        builder.ToTable("PaymentIntents");
        
        builder.HasKey(p => p.Id);
        
        builder.Property(p => p.Id)
            .HasDefaultValueSql("NEWSEQUENTIALID()");
        
        builder.OwnsOne(p => p.Amount, money =>
        {
            money.Property(m => m.Amount)
                .HasColumnName("Amount")
                .HasColumnType("decimal(18,2)");
            
            money.Property(m => m.Currency)
                .HasColumnName("Currency")
                .HasMaxLength(3)
                .IsRequired();
        });
        
        builder.Property(p => p.Status)
            .HasConversion<int>();
        
        builder.Property(p => p.MethodType)
            .HasConversion<int>();
        
        builder.Property(p => p.ClientSecret)
            .HasMaxLength(255);
        
        builder.Property(p => p.RedirectUrl)
            .HasMaxLength(2000);
        
        builder.Property(p => p.QrCodeData)
            .HasMaxLength(2000);
        
        builder.Property(p => p.CancellationReason)
            .HasMaxLength(500);
        
        builder.Property(p => p.ErrorCode)
            .HasMaxLength(50);
        
        builder.Property(p => p.ErrorMessage)
            .HasMaxLength(1000);
        
        builder.Property(p => p.RowVersion)
            .IsRowVersion();
        
        builder.HasMany(p => p.Transactions)
            .WithOne()
            .HasForeignKey("PaymentIntentId")
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasIndex(p => p.InvoiceId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.CreatedAt);
        builder.HasIndex(p => p.ExpiresAt)
            .HasFilter("ExpiresAt IS NOT NULL AND Status IN (0, 1)");
    }
}
```

### 2.2 PaymentTransactionConfiguration

```csharp
public class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> builder)
    {
        builder.ToTable("PaymentTransactions");
        
        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.Id)
            .HasDefaultValueSql("NEWSEQUENTIALID()");
        
        builder.OwnsOne(t => t.Amount, money =>
        {
            money.Property(m => m.Amount)
                .HasColumnName("Amount")
                .HasColumnType("decimal(18,2)");
            
            money.Property(m => m.Currency)
                .HasColumnName("Currency")
                .HasMaxLength(3)
                .IsRequired();
        });
        
        builder.Property(t => t.ProviderName)
            .HasMaxLength(50)
            .IsRequired();
        
        builder.Property(t => t.ExternalTransactionId)
            .HasMaxLength(255);
        
        builder.Property(t => t.Status)
            .HasConversion<int>();
        
        builder.Property(t => t.Type)
            .HasConversion<int>();
        
        builder.Property(t => t.IdempotencyKey)
            .HasMaxLength(255)
            .IsRequired();
        
        builder.Property(t => t.ErrorCode)
            .HasMaxLength(50);
        
        builder.Property(t => t.ErrorMessage)
            .HasMaxLength(1000);
        
        builder.Property(t => t.ProviderResponse)
            .HasColumnType("nvarchar(max)");
        
        builder.Property(t => t.Metadata)
            .HasColumnType("nvarchar(max)");
        
        builder.HasIndex(t => t.IdempotencyKey)
            .IsUnique();
        
        builder.HasIndex(t => t.PaymentIntentId);
        builder.HasIndex(t => t.ExternalTransactionId);
        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => t.ProviderName);
        builder.HasIndex(t => t.CreatedAt);
    }
}
```

### 2.3 RefundConfiguration

```csharp
public class RefundConfiguration : IEntityTypeConfiguration<Refund>
{
    public void Configure(EntityTypeBuilder<Refund> builder)
    {
        builder.ToTable("Refunds");
        
        builder.HasKey(r => r.Id);
        
        builder.Property(r => r.Id)
            .HasDefaultValueSql("NEWSEQUENTIALID()");
        
        builder.OwnsOne(r => r.Amount, money =>
        {
            money.Property(m => m.Amount)
                .HasColumnName("Amount")
                .HasColumnType("decimal(18,2)");
            
            money.Property(m => m.Currency)
                .HasColumnName("Currency")
                .HasMaxLength(3)
                .IsRequired();
        });
        
        builder.Property(r => r.Reason)
            .HasConversion<int>();
        
        builder.Property(r => r.Status)
            .HasConversion<int>();
        
        builder.Property(r => r.ReasonDescription)
            .HasMaxLength(1000);
        
        builder.Property(r => r.ExternalRefundId)
            .HasMaxLength(255);
        
        builder.Property(r => r.IdempotencyKey)
            .HasMaxLength(255)
            .IsRequired();
        
        builder.Property(r => r.ErrorCode)
            .HasMaxLength(50);
        
        builder.Property(r => r.ErrorMessage)
            .HasMaxLength(1000);
        
        builder.Property(r => r.ProviderResponse)
            .HasColumnType("nvarchar(max)");
        
        builder.HasIndex(r => r.IdempotencyKey)
            .IsUnique();
        
        builder.HasIndex(r => r.PaymentTransactionId);
        builder.HasIndex(r => r.ExternalRefundId);
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.CreatedByUserId);
        builder.HasIndex(r => r.CreatedAt);
    }
}
```

## 3. Key Indexes & Performance

### 3.1 Query Patterns & Indexes

| Query Pattern | Index | Purpose |
|---------------|-------|---------|
| Find payment by invoice | `IX_PaymentIntents_InvoiceId` | Fast lookup of payments for invoice |
| Find pending/expired payments | `IX_PaymentIntents_ExpiresAt` | Filtered index for cleanup jobs |
| Find transaction by external ID | `IX_PaymentTransactions_ExternalId` | Webhook processing lookup |
| Prevent duplicate webhooks | `UQ_PaymentTransactions_IdempotencyKey` | Idempotency enforcement |
| Audit trail lookup | `IX_PaymentAuditLogs_EntityType_EntityId` | Compliance queries |
| Reconciliation queries | `IX_PaymentTransactions_ProviderName` + `IX_PaymentTransactions_CreatedAt` | Daily reconciliation |
| Outbox processing | `IX_OutboxMessages_ProcessedAt` | Background job queries |

### 3.2 Performance Considerations

1. **Partitioning Strategy**: Consider partitioning `PaymentAuditLogs` by year for large datasets
2. **Archive Old Data**: Move audit logs older than 2 years to archive tables
3. **Index Maintenance**: Rebuild indexes monthly during maintenance window
4. **Statistics Updates**: Auto-update statistics enabled on all tables
5. **Connection Pooling**: Configure EF Core connection pool: min=10, max=100

## 4. Data Constraints & Validation

### 4.1 Business Constraints

```sql
-- Payment amount must be positive
ALTER TABLE PaymentIntents ADD CONSTRAINT CK_PaymentIntents_Amount_Positive 
    CHECK (Amount > 0);

ALTER TABLE PaymentTransactions ADD CONSTRAINT CK_PaymentTransactions_Amount_Positive 
    CHECK (Amount > 0);

ALTER TABLE Refunds ADD CONSTRAINT CK_Refunds_Amount_Positive 
    CHECK (Amount > 0);

-- Currency must be valid ISO code
ALTER TABLE PaymentIntents ADD CONSTRAINT CK_PaymentIntents_Currency_Valid 
    CHECK (Currency IN ('VND', 'USD', 'EUR', 'GBP'));

-- Idempotency keys must be unique and non-empty
ALTER TABLE PaymentTransactions ADD CONSTRAINT CK_PaymentTransactions_IdempotencyKey 
    CHECK (LEN(IdempotencyKey) > 0);

ALTER TABLE Refunds ADD CONSTRAINT CK_Refunds_IdempotencyKey 
    CHECK (LEN(IdempotencyKey) > 0);

-- Status must be valid enum value
ALTER TABLE PaymentIntents ADD CONSTRAINT CK_PaymentIntents_Status_Valid 
    CHECK (Status BETWEEN 0 AND 6);

ALTER TABLE PaymentTransactions ADD CONSTRAINT CK_PaymentTransactions_Status_Valid 
    CHECK (Status BETWEEN 0 AND 4);

ALTER TABLE Refunds ADD CONSTRAINT CK_Refunds_Status_Valid 
    CHECK (Status BETWEEN 0 AND 3);
```

### 4.2 Referential Integrity

- **Cascade Deletes**: PaymentIntents cascade to PaymentTransactions and Refunds
- **Restrict Deletes**: Cannot delete Invoice if PaymentIntents exist (configurable)
- **Soft Deletes**: Consider implementing soft deletes for compliance

## 5. Data Retention & Cleanup

### 5.1 Retention Policies

| Table | Retention Period | Action |
|-------|-----------------|--------|
| PaymentIntents | 7 years | Legal requirement |
| PaymentTransactions | 7 years | Legal requirement |
| Refunds | 7 years | Legal requirement |
| PaymentAuditLogs | 7 years | Compliance |
| IdempotencyRecords | 24 hours | Auto-delete |
| OutboxMessages | 7 days | Archive then delete |
| ReconciliationReports | 3 years | Archive old reports |

### 5.2 Cleanup Jobs

```sql
-- Cleanup expired idempotency records (run hourly)
DELETE FROM IdempotencyRecords 
WHERE ExpiresAt < GETUTCDATE();

-- Cleanup processed outbox messages (run daily)
DELETE FROM OutboxMessages 
WHERE ProcessedAt IS NOT NULL 
  AND ProcessedAt < DATEADD(DAY, -7, GETUTCDATE());

-- Archive old audit logs (run monthly)
INSERT INTO PaymentAuditLogsArchive 
SELECT * FROM PaymentAuditLogs 
WHERE Timestamp < DATEADD(YEAR, -2, GETUTCDATE());

DELETE FROM PaymentAuditLogs 
WHERE Timestamp < DATEADD(YEAR, -2, GETUTCDATE());
```

## 6. Database Migration Strategy

### 6.1 Initial Migration

```bash
# Create migration
dotnet ef migrations add AddPaymentCore --project RentalManagement.Api

# Review generated migration
# Apply migration
dotnet ef database update --project RentalManagement.Api
```

### 6.2 Migration Checklist

- [ ] Backup production database before migration
- [ ] Test migration on staging environment
- [ ] Verify all indexes created correctly
- [ ] Validate constraints and foreign keys
- [ ] Check query performance with sample data
- [ ] Run smoke tests on critical queries
- [ ] Monitor database CPU/Memory after deployment

## 7. Security Considerations

### 7.1 Column-Level Encryption

```sql
-- Encrypt sensitive data at rest (if storing card tokens)
-- Use Always Encrypted for PCI compliance
ALTER TABLE PaymentTransactions 
ALTER COLUMN ProviderResponse 
ADD ENCRYPTED WITH (
    COLUMN_ENCRYPTION_KEY = PaymentCoreEncryptionKey,
    ENCRYPTION_TYPE = DETERMINISTIC,
    ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
);
```

### 7.2 Row-Level Security

```sql
-- Implement RLS for multi-tenant isolation
CREATE FUNCTION dbo.fn_PaymentSecurity(@TenantId UNIQUEIDENTIFIER)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS result
WHERE @TenantId = CAST(SESSION_CONTEXT(N'TenantId') AS UNIQUEIDENTIFIER)
    OR IS_MEMBER('db_owner') = 1;

ALTER TABLE PaymentIntents
ADD CONSTRAINT CK_PaymentIntents_TenantAccess
CHECK (dbo.fn_PaymentSecurity(TenantId) = 1);
```

### 7.3 Audit Triggers (Optional)

```sql
-- Auto-audit all payment changes
CREATE TRIGGER trg_PaymentIntents_Audit
ON PaymentIntents
AFTER UPDATE
AS
BEGIN
    INSERT INTO PaymentAuditLogs (
        EntityType, EntityId, Action, 
        OldValue, NewValue, Timestamp, CorrelationId
    )
    SELECT 
        'PaymentIntent',
        i.Id,
        'Updated',
        (SELECT * FROM DELETED d WHERE d.Id = i.Id FOR JSON PATH),
        (SELECT * FROM INSERTED i WHERE i.Id = i.Id FOR JSON PATH),
        GETUTCDATE(),
        CAST(SESSION_CONTEXT(N'CorrelationId') AS VARCHAR(100))
    FROM INSERTED i;
END;
```

---

**Next Steps**: Implement security features (webhook verification, secret storage, audit logging).
