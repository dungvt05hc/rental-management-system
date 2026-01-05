namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service for generating PDF documents
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Generates a PDF for an invoice
    /// </summary>
    /// <param name="invoiceId">ID of the invoice to generate PDF for</param>
    /// <returns>PDF document as byte array</returns>
    Task<byte[]> GenerateInvoicePdfAsync(int invoiceId);
}
