using Microsoft.AspNetCore.Identity;

namespace RentalManagement.Api.Models.Entities;

/// <summary>
/// Represents a user in the rental management system with role-based permissions
/// </summary>
public class User : IdentityUser
{
    /// <summary>
    /// User's first name
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// When the user was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the user was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether the user is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// User's full name for display purposes
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();
}
