using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents an invoice for rental payments and additional charges
/// </summary>
public class Invoice
{
    /// <summary>
    /// Unique identifier for the invoice
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Unique invoice number for identification
    /// </summary>
    [Required]
    [StringLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    /// <summary>
    /// ID of the tenant this invoice belongs to
    /// </summary>
    [Required]
    [ForeignKey(nameof(Tenant))]
    public int TenantId { get; set; }

    /// <summary>
    /// The tenant this invoice belongs to
    /// </summary>
    public virtual Tenant Tenant { get; set; } = null!;

    /// <summary>
    /// ID of the room this invoice is for
    /// </summary>
    [Required]
    [ForeignKey(nameof(Room))]
    public int RoomId { get; set; }

    /// <summary>
    /// The room this invoice is for
    /// </summary>
    public virtual Room Room { get; set; } = null!;

    /// <summary>
    /// Base monthly rent amount
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Additional charges (utilities, maintenance, etc.)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal AdditionalCharges { get; set; }

    /// <summary>
    /// Discount applied to the invoice
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal Discount { get; set; }

    /// <summary>
    /// Total amount due for this invoice
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Amount already paid for this invoice
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal PaidAmount { get; set; }

    /// <summary>
    /// Remaining balance on this invoice
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal RemainingBalance { get; set; }

    /// <summary>
    /// Current status of the invoice
    /// </summary>
    [Required]
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;

    /// <summary>
    /// Month and year this invoice is for
    /// </summary>
    [Required]
    public DateTime BillingPeriod { get; set; }

    /// <summary>
    /// When the invoice was issued
    /// </summary>
    [Required]
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When payment is due
    /// </summary>
    [Required]
    public DateTime DueDate { get; set; }

    /// <summary>
    /// When the invoice was fully paid (if applicable)
    /// </summary>
    public DateTime? PaidDate { get; set; }

    /// <summary>
    /// Description or notes for additional charges
    /// </summary>
    [StringLength(1000)]
    public string AdditionalChargesDescription { get; set; } = string.Empty;

    /// <summary>
    /// General notes about the invoice
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the invoice was created in the system
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the invoice was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Collection of payments made for this invoice
    /// </summary>
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    /// <summary>
    /// Whether the invoice is overdue
    /// </summary>
    public bool IsOverdue => Status != InvoiceStatus.Paid && DateTime.UtcNow > DueDate;

    /// <summary>
    /// Whether the invoice is partially paid
    /// </summary>
    public bool IsPartiallyPaid => PaidAmount > 0 && PaidAmount < TotalAmount;
}

/// <summary>
/// Enumeration of possible invoice statuses
/// </summary>
public enum InvoiceStatus
{
    Draft = 1,
    Issued = 2,
    Unpaid = 3,
    PartiallyPaid = 4,
    Paid = 5,
    Overdue = 6,
    Cancelled = 7
}
