namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Per-month counter backing invoice number generation.
/// One row per billing period; the row is incremented atomically so that
/// concurrent requests can never be handed the same invoice number.
/// </summary>
public class InvoiceNumberCounter
{
    /// <summary>
    /// Period the counter belongs to, formatted as "yyyyMM" (e.g. "202609").
    /// This is the primary key: invoice numbers restart at 0001 each month.
    /// </summary>
    public required string Period { get; set; }

    /// <summary>
    /// Last sequence number handed out for this period.
    /// Only ever increases, so deleting an invoice never recycles its number.
    /// </summary>
    public int LastValue { get; set; }
}
