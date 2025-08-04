using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a tenant who rents rooms in the system
/// </summary>
public class Tenant
{
    /// <summary>
    /// Unique identifier for the tenant
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Tenant's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's email address
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's phone number
    /// </summary>
    [Required]
    [Phone]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Tenant's national ID or identification number
    /// </summary>
    [StringLength(50)]
    public string IdentificationNumber { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact name
    /// </summary>
    [StringLength(200)]
    public string EmergencyContactName { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact phone number
    /// </summary>
    [StringLength(20)]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    /// <summary>
    /// ID of the room currently assigned to this tenant
    /// </summary>
    [ForeignKey(nameof(Room))]
    public int? RoomId { get; set; }

    /// <summary>
    /// The room currently assigned to this tenant
    /// </summary>
    public virtual Room? Room { get; set; }

    /// <summary>
    /// When the rental contract started
    /// </summary>
    public DateTime? ContractStartDate { get; set; }

    /// <summary>
    /// When the rental contract ends
    /// </summary>
    public DateTime? ContractEndDate { get; set; }

    /// <summary>
    /// Security deposit amount paid by the tenant
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Monthly rent amount for this tenant (may differ from room base rent)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Whether the tenant is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Additional notes about the tenant
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the tenant record was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the tenant record was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Collection of invoices for this tenant
    /// </summary>
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    /// <summary>
    /// Tenant's full name for display purposes
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// Whether the tenant currently has an active rental contract
    /// </summary>
    public bool HasActiveContract => 
        ContractStartDate.HasValue && 
        ContractEndDate.HasValue && 
        DateTime.UtcNow >= ContractStartDate && 
        DateTime.UtcNow <= ContractEndDate && 
        IsActive;
}
