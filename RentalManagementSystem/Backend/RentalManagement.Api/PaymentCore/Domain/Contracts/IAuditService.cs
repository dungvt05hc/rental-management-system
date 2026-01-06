using RentalManagement.Api.PaymentCore.Domain.Entities;

namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

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

/// <summary>
/// Immutable audit log for all payment operations
/// </summary>
public class PaymentAuditLog
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime Timestamp { get; set; }
    public Guid? UserId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
}
