using System.ComponentModel.DataAnnotations;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new invoice
/// </summary>
public class CreateInvoiceDto
{
    /// <summary>
    /// ID of the tenant this invoice belongs to
    /// </summary>
    [Required]
    public int TenantId { get; set; }

    /// <summary>
    /// ID of the room this invoice is for
    /// </summary>
    [Required]
    public int RoomId { get; set; }

    /// <summary>
    /// Month and year this invoice is for
    /// </summary>
    [Required]
    public DateTime BillingPeriod { get; set; }

    /// <summary>
    /// Additional charges (utilities, maintenance, etc.)
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal AdditionalCharges { get; set; }

    /// <summary>
    /// Discount applied to the invoice
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }

    /// <summary>
    /// When payment is due
    /// </summary>
    [Required]
    public DateTime DueDate { get; set; }

    /// <summary>
    /// Description for additional charges
    /// </summary>
    [StringLength(1000)]
    public string AdditionalChargesDescription { get; set; } = string.Empty;

    /// <summary>
    /// General notes about the invoice
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// List of line items for this invoice
    /// </summary>
    public List<CreateInvoiceItemDto> InvoiceItems { get; set; } = new();
}

/// <summary>
/// DTO for updating an existing invoice
/// </summary>
public class UpdateInvoiceDto
{
    /// <summary>
    /// Additional charges (utilities, maintenance, etc.)
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? AdditionalCharges { get; set; }

    /// <summary>
    /// Discount applied to the invoice
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? Discount { get; set; }

    /// <summary>
    /// Current status of the invoice
    /// </summary>
    public InvoiceStatus? Status { get; set; }

    /// <summary>
    /// When payment is due
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// Description for additional charges
    /// </summary>
    [StringLength(1000)]
    public string? AdditionalChargesDescription { get; set; }

    /// <summary>
    /// General notes about the invoice
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }

    /// <summary>
    /// List of line items for this invoice (will replace existing items)
    /// </summary>
    public List<CreateInvoiceItemDto>? InvoiceItems { get; set; }
}

/// <summary>
/// DTO for invoice information response
/// </summary>
public class InvoiceDto
{
    /// <summary>
    /// Unique identifier for the invoice
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Unique invoice number
    /// </summary>
    public string InvoiceNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tenant information
    /// </summary>
    public TenantSummaryDto Tenant { get; set; } = null!;

    /// <summary>
    /// Room information
    /// </summary>
    public RoomSummaryDto Room { get; set; } = null!;

    /// <summary>
    /// Base monthly rent amount
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Additional charges
    /// </summary>
    public decimal AdditionalCharges { get; set; }

    /// <summary>
    /// Discount applied
    /// </summary>
    public decimal Discount { get; set; }

    /// <summary>
    /// Total amount due
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Amount already paid
    /// </summary>
    public decimal PaidAmount { get; set; }

    /// <summary>
    /// Remaining balance
    /// </summary>
    public decimal RemainingBalance { get; set; }

    /// <summary>
    /// Current status of the invoice
    /// </summary>
    public InvoiceStatus Status { get; set; }

    /// <summary>
    /// Status as string
    /// </summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>
    /// Month and year this invoice is for
    /// </summary>
    public DateTime BillingPeriod { get; set; }

    /// <summary>
    /// When the invoice was issued
    /// </summary>
    public DateTime IssueDate { get; set; }

    /// <summary>
    /// When payment is due
    /// </summary>
    public DateTime DueDate { get; set; }

    /// <summary>
    /// When the invoice was fully paid
    /// </summary>
    public DateTime? PaidDate { get; set; }

    /// <summary>
    /// Whether the invoice is overdue
    /// </summary>
    public bool IsOverdue { get; set; }

    /// <summary>
    /// Whether the invoice is partially paid
    /// </summary>
    public bool IsPartiallyPaid { get; set; }

    /// <summary>
    /// Description for additional charges
    /// </summary>
    public string AdditionalChargesDescription { get; set; } = string.Empty;

    /// <summary>
    /// General notes about the invoice
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// List of payments made for this invoice
    /// </summary>
    public List<PaymentSummaryDto> Payments { get; set; } = new();

    /// <summary>
    /// List of line items for this invoice
    /// </summary>
    public List<InvoiceItemDto> InvoiceItems { get; set; } = new();

    /// <summary>
    /// When the invoice was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the invoice was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for invoice summary information
/// </summary>
public class InvoiceSummaryDto
{
    /// <summary>
    /// Unique identifier for the invoice
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Unique invoice number
    /// </summary>
    public string InvoiceNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's full name
    /// </summary>
    public string TenantName { get; set; } = string.Empty;

    /// <summary>
    /// Room number
    /// </summary>
    public string RoomNumber { get; set; } = string.Empty;

    /// <summary>
    /// Total amount due
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Remaining balance
    /// </summary>
    public decimal RemainingBalance { get; set; }

    /// <summary>
    /// Current status
    /// </summary>
    public InvoiceStatus Status { get; set; }

    /// <summary>
    /// Status as string
    /// </summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>
    /// Month and year this invoice is for
    /// </summary>
    public DateTime BillingPeriod { get; set; }

    /// <summary>
    /// When payment is due
    /// </summary>
    public DateTime DueDate { get; set; }

    /// <summary>
    /// Whether the invoice is overdue
    /// </summary>
    public bool IsOverdue { get; set; }
}

/// <summary>
/// DTO for creating a payment
/// </summary>
public class CreatePaymentDto
{
    /// <summary>
    /// ID of the invoice this payment is for
    /// </summary>
    [Required]
    public int InvoiceId { get; set; }

    /// <summary>
    /// Amount of this payment
    /// </summary>
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than 0")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Method used for payment
    /// </summary>
    [Required]
    public PaymentMethod Method { get; set; }

    /// <summary>
    /// Reference number for the payment
    /// </summary>
    [StringLength(100)]
    public string ReferenceNumber { get; set; } = string.Empty;

    /// <summary>
    /// When the payment was made
    /// </summary>
    [Required]
    public DateTime PaymentDate { get; set; }

    /// <summary>
    /// Notes about the payment
    /// </summary>
    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>
/// DTO for payment information response
/// </summary>
public class PaymentDto
{
    /// <summary>
    /// Unique identifier for the payment
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Invoice information
    /// </summary>
    public InvoiceSummaryDto Invoice { get; set; } = null!;

    /// <summary>
    /// Amount of this payment
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Method used for payment
    /// </summary>
    public PaymentMethod Method { get; set; }

    /// <summary>
    /// Method as string
    /// </summary>
    public string MethodName { get; set; } = string.Empty;

    /// <summary>
    /// Reference number for the payment
    /// </summary>
    public string ReferenceNumber { get; set; } = string.Empty;

    /// <summary>
    /// When the payment was made
    /// </summary>
    public DateTime PaymentDate { get; set; }

    /// <summary>
    /// When the payment was recorded
    /// </summary>
    public DateTime RecordedDate { get; set; }

    /// <summary>
    /// Who recorded this payment
    /// </summary>
    public string? RecordedByUserId { get; set; }

    /// <summary>
    /// Notes about the payment
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Whether this payment has been verified
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// When the payment was created
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for payment summary information
/// </summary>
public class PaymentSummaryDto
{
    /// <summary>
    /// Unique identifier for the payment
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Amount of this payment
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Method used for payment
    /// </summary>
    public PaymentMethod Method { get; set; }

    /// <summary>
    /// Method as string
    /// </summary>
    public string MethodName { get; set; } = string.Empty;

    /// <summary>
    /// When the payment was made
    /// </summary>
    public DateTime PaymentDate { get; set; }

    /// <summary>
    /// Reference number for the payment
    /// </summary>
    public string ReferenceNumber { get; set; } = string.Empty;
}

/// <summary>
/// DTO for invoice search and filter parameters
/// </summary>
public class InvoiceSearchDto
{
    /// <summary>
    /// Search term for invoice number, tenant name, or room number
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by invoice status
    /// </summary>
    public InvoiceStatus? Status { get; set; }

    /// <summary>
    /// Filter by specific tenant
    /// </summary>
    public int? TenantId { get; set; }

    /// <summary>
    /// Filter by specific room
    /// </summary>
    public int? RoomId { get; set; }

    /// <summary>
    /// Filter by billing period (month/year)
    /// </summary>
    public DateTime? BillingPeriod { get; set; }

    /// <summary>
    /// Filter by due date from
    /// </summary>
    public DateTime? DueDateFrom { get; set; }

    /// <summary>
    /// Filter by due date to
    /// </summary>
    public DateTime? DueDateTo { get; set; }

    /// <summary>
    /// Filter by overdue invoices only
    /// </summary>
    public bool? IsOverdue { get; set; }

    /// <summary>
    /// Page number for pagination
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// Sort field
    /// </summary>
    public string SortBy { get; set; } = "DueDate";

    /// <summary>
    /// Sort direction (asc/desc)
    /// </summary>
    public string SortDirection { get; set; } = "desc";
}

/// <summary>
/// DTO for creating a new invoice item
/// </summary>
public class CreateInvoiceItemDto
{
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
    [Range(0.001, double.MaxValue)]
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
    [Range(0, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Discount percentage (0-100)
    /// </summary>
    [Range(0, 100)]
    public decimal DiscountPercent { get; set; } = 0;

    /// <summary>
    /// Discount amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal DiscountAmount { get; set; } = 0;

    /// <summary>
    /// Tax percentage (0-100)
    /// </summary>
    [Range(0, 100)]
    public decimal TaxPercent { get; set; } = 0;

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
}

/// <summary>
/// DTO for updating an invoice item
/// </summary>
public class UpdateInvoiceItemDto
{
    /// <summary>
    /// Item code or SKU
    /// </summary>
    [StringLength(50)]
    public string? ItemCode { get; set; }

    /// <summary>
    /// Item name or description
    /// </summary>
    [StringLength(200)]
    public string? ItemName { get; set; }

    /// <summary>
    /// Detailed description of the item
    /// </summary>
    [StringLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Quantity of this item
    /// </summary>
    [Range(0.001, double.MaxValue)]
    public decimal? Quantity { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    [StringLength(20)]
    public string? UnitOfMeasure { get; set; }

    /// <summary>
    /// Unit price for this item
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? UnitPrice { get; set; }

    /// <summary>
    /// Discount percentage
    /// </summary>
    [Range(0, 100)]
    public decimal? DiscountPercent { get; set; }

    /// <summary>
    /// Discount amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? DiscountAmount { get; set; }

    /// <summary>
    /// Tax percentage
    /// </summary>
    [Range(0, 100)]
    public decimal? TaxPercent { get; set; }

    /// <summary>
    /// Line number
    /// </summary>
    public int? LineNumber { get; set; }

    /// <summary>
    /// Item category
    /// </summary>
    [StringLength(100)]
    public string? Category { get; set; }

    /// <summary>
    /// Notes
    /// </summary>
    [StringLength(500)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for invoice item response
/// </summary>
public class InvoiceItemDto
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Invoice ID
    /// </summary>
    public int InvoiceId { get; set; }

    /// <summary>
    /// Item code or SKU
    /// </summary>
    public string ItemCode { get; set; } = string.Empty;

    /// <summary>
    /// Item name
    /// </summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Description
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Quantity
    /// </summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    public string UnitOfMeasure { get; set; } = string.Empty;

    /// <summary>
    /// Unit price
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Discount percentage
    /// </summary>
    public decimal DiscountPercent { get; set; }

    /// <summary>
    /// Discount amount
    /// </summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>
    /// Tax percentage
    /// </summary>
    public decimal TaxPercent { get; set; }

    /// <summary>
    /// Tax amount
    /// </summary>
    public decimal TaxAmount { get; set; }

    /// <summary>
    /// Line total before tax
    /// </summary>
    public decimal LineTotal { get; set; }

    /// <summary>
    /// Line total with tax
    /// </summary>
    public decimal LineTotalWithTax { get; set; }

    /// <summary>
    /// Line number
    /// </summary>
    public int LineNumber { get; set; }

    /// <summary>
    /// Category
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Notes
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Created date
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Updated date
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
