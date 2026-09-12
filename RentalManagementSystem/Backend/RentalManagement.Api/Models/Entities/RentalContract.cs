using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents one rental agreement between a customer and a room.
/// A customer may hold many contracts over time; contracts are never deleted,
/// they move to <see cref="RentalContractStatus.Ended"/> so history is preserved.
/// </summary>
public class RentalContract
{
    /// <summary>
    /// Unique identifier for the contract
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// ID of the customer holding this contract
    /// </summary>
    [Required]
    [ForeignKey(nameof(Customer))]
    public int CustomerId { get; set; }

    /// <summary>
    /// The customer holding this contract
    /// </summary>
    public virtual Customer Customer { get; set; } = null!;

    /// <summary>
    /// ID of the room being rented
    /// </summary>
    [Required]
    [ForeignKey(nameof(Room))]
    public int RoomId { get; set; }

    /// <summary>
    /// The room being rented
    /// </summary>
    public virtual Room Room { get; set; } = null!;

    /// <summary>
    /// When the rental contract starts
    /// </summary>
    [Required]
    public DateTime StartDate { get; set; }

    /// <summary>
    /// When the rental contract ends. Null for an open-ended contract.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Monthly rent agreed for this contract (may differ from the room's base rent)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Security deposit held for this contract
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Current status of the contract
    /// </summary>
    [Required]
    public RentalContractStatus Status { get; set; } = RentalContractStatus.Draft;

    /// <summary>
    /// Additional notes about the contract
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the contract was created in the system
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the contract was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Invoices issued under this contract
    /// </summary>
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    /// <summary>
    /// Whether the contract is active and today falls inside its term
    /// </summary>
    public bool IsCurrentlyActive =>
        Status == RentalContractStatus.Active &&
        DateTime.UtcNow >= StartDate &&
        (!EndDate.HasValue || DateTime.UtcNow <= EndDate.Value);
}

/// <summary>
/// Enumeration of possible rental contract statuses
/// </summary>
public enum RentalContractStatus
{
    Draft = 1,
    Active = 2,
    Ended = 3,
    Cancelled = 4
}
