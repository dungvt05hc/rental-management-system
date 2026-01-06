namespace RentalManagement.Api.PaymentCore.Domain.ValueObjects;

/// <summary>
/// Money value object - ensures amount and currency consistency
/// Immutable record type following DDD principles
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
    
    public override string ToString() => $"{Amount:N2} {Currency}";
}
