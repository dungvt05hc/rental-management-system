using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a rental room with all its properties and current status
/// </summary>
public class Room
{
    /// <summary>
    /// Unique identifier for the room
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Room number for identification (e.g., "101", "A-205")
    /// </summary>
    [Required]
    [StringLength(20)]
    public string RoomNumber { get; set; } = string.Empty;

    /// <summary>
    /// Type of room (Single, Double, Suite, etc.)
    /// </summary>
    [Required]
    public RoomType Type { get; set; }

    /// <summary>
    /// Monthly rent price for the room
    /// </summary>
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Current status of the room
    /// </summary>
    [Required]
    public RoomStatus Status { get; set; } = RoomStatus.Vacant;

    /// <summary>
    /// Floor number where the room is located
    /// </summary>
    public int Floor { get; set; }

    /// <summary>
    /// Area of the room in square meters
    /// </summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal? Area { get; set; }

    /// <summary>
    /// Description or additional notes about the room
    /// </summary>
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Whether the room has air conditioning
    /// </summary>
    public bool HasAirConditioning { get; set; }

    /// <summary>
    /// Whether the room has a private bathroom
    /// </summary>
    public bool HasPrivateBathroom { get; set; }

    /// <summary>
    /// Whether the room is furnished
    /// </summary>
    public bool IsFurnished { get; set; }

    /// <summary>
    /// When the room was created in the system
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the room was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Collection of rental contracts covering this room, past and present
    /// </summary>
    public virtual ICollection<RentalContract> RentalContracts { get; set; } = new List<RentalContract>();

    /// <summary>
    /// Collection of invoices associated with this room
    /// </summary>
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    /// <summary>
    /// Số phòng và mô tả đã bỏ dấu và hạ chữ thường, phục vụ tìm kiếm.
    /// Xem ghi chú ở <see cref="Customer.SearchText"/>.
    /// </summary>
    public string SearchText { get; private set; } = string.Empty;
}

/// <summary>
/// Enumeration of possible room types
/// </summary>
public enum RoomType
{
    Single = 1,
    Double = 2,
    Triple = 3,
    Suite = 4,
    Studio = 5,
    Apartment = 6
}

/// <summary>
/// Enumeration of possible room statuses
/// </summary>
public enum RoomStatus
{
    Vacant = 1,
    Rented = 2,
    Maintenance = 3,
    Reserved = 4
}
