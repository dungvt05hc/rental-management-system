using RentalManagement.Api.PaymentCore.Domain.Enums;

namespace RentalManagement.Api.PaymentCore.Domain.Contracts;

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
