using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a reusable item that can be added to invoices
/// </summary>
public class Item
{
    /// <summary>
    /// Unique identifier for the item
    /// </summary>
    [Key]
    public int Id { get; set; }

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
    /// Unit of measure (e.g., pcs, kg, m, hrs)
    /// </summary>
    [StringLength(20)]
    public string UnitOfMeasure { get; set; } = "pcs";

    /// <summary>
    /// Default unit price for this item
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Default tax percentage (0-100)
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal TaxPercent { get; set; } = 0;

    /// <summary>
    /// Item category or type
    /// </summary>
    [StringLength(100)]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Whether this item is active and can be used
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Additional notes for this item
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
}
