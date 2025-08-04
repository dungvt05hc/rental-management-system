using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a payment made towards an invoice
/// </summary>
public class Payment
{
    /// <summary>
    /// Unique identifier for the payment
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// ID of the invoice this payment is for
    /// </summary>
    [Required]
    [ForeignKey(nameof(Invoice))]
    public int InvoiceId { get; set; }

    /// <summary>
    /// The invoice this payment is for
    /// </summary>
    public virtual Invoice Invoice { get; set; } = null!;

    /// <summary>
    /// Amount of this payment
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Method used for payment
    /// </summary>
    [Required]
    public PaymentMethod Method { get; set; }

    /// <summary>
    /// Reference number for the payment (check number, transaction ID, etc.)
    /// </summary>
    [StringLength(100)]
    public string ReferenceNumber { get; set; } = string.Empty;

    /// <summary>
    /// When the payment was made
    /// </summary>
    [Required]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the payment was recorded in the system
    /// </summary>
    public DateTime RecordedDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// ID of the user who recorded this payment
    /// </summary>
    [StringLength(450)] // Standard ASP.NET Identity user ID length
    public string? RecordedByUserId { get; set; }

    /// <summary>
    /// Notes about the payment
    /// </summary>
    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Whether this payment has been verified/confirmed
    /// </summary>
    public bool IsVerified { get; set; } = true;

    /// <summary>
    /// When the payment record was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the payment record was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Enumeration of possible payment methods
/// </summary>
public enum PaymentMethod
{
    Cash = 1,
    Check = 2,
    BankTransfer = 3,
    CreditCard = 4,
    DebitCard = 5,
    DigitalWallet = 6,
    MoneyOrder = 7,
    Other = 8
}
