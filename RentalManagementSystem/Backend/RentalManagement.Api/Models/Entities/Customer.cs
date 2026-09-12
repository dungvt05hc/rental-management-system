using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a customer — a person who may hold one or more rental contracts.
/// Holds personal details only; everything about what they rent lives on <see cref="RentalContract"/>.
/// </summary>
public class Customer
{
    /// <summary>
    /// Unique identifier for the customer
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Customer's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's email address
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Customer's phone number
    /// </summary>
    [Required]
    [Phone]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Customer's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Customer's national ID or identification number
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
    /// Whether the customer is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Additional notes about the customer
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the customer record was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the customer record was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Every rental contract this customer has held, past and present
    /// </summary>
    public virtual ICollection<RentalContract> RentalContracts { get; set; } = new List<RentalContract>();

    /// <summary>
    /// Collection of invoices for this customer
    /// </summary>
    public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

    /// <summary>
    /// Customer's full name for display purposes
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// Họ tên, email, điện thoại đã bỏ dấu và hạ chữ thường, phục vụ tìm kiếm.
    /// </summary>
    /// <remarks>
    /// PostgreSQL tự tính cột này (GENERATED ALWAYS ... STORED) nên nó luôn khớp
    /// với dữ liệu, không cần code nào nhớ cập nhật. Chỉ đọc, không ghi.
    /// Chuẩn hoá từ khoá phía C# bằng <see cref="Services.SearchText.Normalize"/>.
    /// </remarks>
    public string SearchText { get; private set; } = string.Empty;
}
