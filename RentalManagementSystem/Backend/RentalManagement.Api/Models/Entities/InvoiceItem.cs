using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents an individual line item on an invoice (like in ERP systems)
/// </summary>
public class InvoiceItem
{
    /// <summary>
    /// Unique identifier for the invoice item
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// ID of the invoice this item belongs to
    /// </summary>
    [Required]
    [ForeignKey(nameof(Invoice))]
    public int InvoiceId { get; set; }

    /// <summary>
    /// Reference to the invoice
    /// </summary>
    public virtual Invoice Invoice { get; set; } = null!;

    /// <summary>
    /// Item code or SKU
    /// </summary>
    [Required]
    [StringLength(50)]
    public string ItemCode { get; set; } = string.Empty;

    /// <summary>
    /// Item name or description
    /// </summary>
    [Required]
    [StringLength(200)]
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Detailed description of the item
    /// </summary>
    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Quantity of this item
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }

    /// <summary>
    /// Unit of measure (e.g., pcs, kg, m, hrs)
    /// </summary>
    [StringLength(20)]
    public string UnitOfMeasure { get; set; } = "pcs";

    /// <summary>
    /// Unit price for this item
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Discount percentage (0-100)
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal DiscountPercent { get; set; } = 0;

    /// <summary>
    /// Discount amount
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; } = 0;

    /// <summary>
    /// Tax percentage (0-100)
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal TaxPercent { get; set; } = 0;

    /// <summary>
    /// Tax amount
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; } = 0;

    /// <summary>
    /// Line total before tax (Quantity * UnitPrice - Discount)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal LineTotal { get; set; }

    /// <summary>
    /// Line total including tax
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal LineTotalWithTax { get; set; }

    /// <summary>
    /// Line number for ordering
    /// </summary>
    public int LineNumber { get; set; }

    /// <summary>
    /// Item category or type
    /// </summary>
    [StringLength(100)]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Additional notes for this line item
    /// </summary>
    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the item was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the item was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Calculate line totals based on quantity, price, discount, and tax
    /// </summary>
    public void CalculateTotals()
    {
        // Calculate discount amount if percentage is provided
        if (DiscountPercent > 0 && DiscountAmount == 0)
        {
            DiscountAmount = (Quantity * UnitPrice * DiscountPercent) / 100;
        }

        // Calculate line total before tax
        LineTotal = (Quantity * UnitPrice) - DiscountAmount;

        // Calculate tax amount if percentage is provided
        if (TaxPercent > 0)
        {
            TaxAmount = (LineTotal * TaxPercent) / 100;
        }

        // Calculate line total with tax
        LineTotalWithTax = LineTotal + TaxAmount;
    }
}