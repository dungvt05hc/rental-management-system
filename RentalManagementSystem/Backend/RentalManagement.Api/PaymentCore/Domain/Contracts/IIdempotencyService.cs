namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

/// <summary>
/// Ensures exactly-once processing of requests through idempotency
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
