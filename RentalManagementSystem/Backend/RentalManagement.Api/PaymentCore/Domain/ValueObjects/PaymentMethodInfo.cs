using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.ValueObjects;

/// <summary>
/// Payment method information - tokenized/safe representation
/// Never stores sensitive data like full card numbers or CVV
/// </summary>
public record PaymentMethodInfo
{
    public PaymentMethodType Type { get; init; }
    public string? Last4Digits { get; init; }
    public string? BankName { get; init; }
    public string? AccountHolderName { get; init; }
    public string? ProviderToken { get; init; }
    public DateTime? ExpiryDate { get; init; }
    
    /// <summary>
    /// Create payment method info for card payments
    /// </summary>
    public static PaymentMethodInfo ForCard(string last4Digits, DateTime expiryDate, string? cardBrand = null)
    {
        if (last4Digits.Length != 4)
            throw new ArgumentException("Last 4 digits must be exactly 4 characters", nameof(last4Digits));
            
        return new PaymentMethodInfo
        {
            Type = cardBrand?.ToLowerInvariant() switch
            {
                "visa" => PaymentMethodType.Visa,
                "mastercard" => PaymentMethodType.Mastercard,
                _ => PaymentMethodType.Visa
            },
            Last4Digits = last4Digits,
            ExpiryDate = expiryDate
        };
    }
    
    /// <summary>
    /// Create payment method info for MoMo wallet
    /// </summary>
    public static PaymentMethodInfo ForMoMo(string phoneNumber)
    {
        return new PaymentMethodInfo
        {
            Type = PaymentMethodType.MoMo,
            AccountHolderName = MaskPhoneNumber(phoneNumber)
        };
    }
    
    /// <summary>
    /// Create payment method info for bank transfer
    /// </summary>
    public static PaymentMethodInfo ForBankTransfer(string bankName, string accountNumber)
    {
        return new PaymentMethodInfo
        {
            Type = PaymentMethodType.BankTransfer,
            BankName = bankName,
            Last4Digits = accountNumber.Length >= 4 ? accountNumber[^4..] : accountNumber
        };
    }
    
    /// <summary>
    /// Create payment method info for cash
    /// </summary>
    public static PaymentMethodInfo ForCash()
    {
        return new PaymentMethodInfo
        {
            Type = PaymentMethodType.Cash
        };
    }
    
    private static string MaskPhoneNumber(string phone)
    {
        if (phone.Length < 4) return "***";
        return $"***{phone[^4..]}";
    }
}
