using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Data;

/// <summary>
/// Entity Framework DbContext for the rental management system
/// Handles database operations and entity configurations
/// </summary>
public class RentalManagementContext : IdentityDbContext<User>
{
    public RentalManagementContext(DbContextOptions<RentalManagementContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Rooms available for rent
    /// </summary>
    public DbSet<Room> Rooms { get; set; } = null!;

    /// <summary>
    /// Tenants who rent rooms
    /// </summary>
    public DbSet<Tenant> Tenants { get; set; } = null!;

    /// <summary>
    /// Invoices for rental payments
    /// </summary>
    public DbSet<Invoice> Invoices { get; set; } = null!;

    /// <summary>
    /// Payments made towards invoices
    /// </summary>
    public DbSet<Payment> Payments { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Room entity
        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasIndex(r => r.RoomNumber)
                  .IsUnique()
                  .HasDatabaseName("IX_Rooms_RoomNumber");

            entity.Property(r => r.MonthlyRent)
                  .HasPrecision(18, 2);

            entity.Property(r => r.Area)
                  .HasPrecision(10, 2);

            entity.Property(r => r.CreatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(r => r.UpdatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");
        });

        // Configure Tenant entity
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasIndex(t => t.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Tenants_Email");

            entity.HasIndex(t => t.IdentificationNumber)
                  .IsUnique()
                  .HasDatabaseName("IX_Tenants_IdentificationNumber")
                  .HasFilter("[IdentificationNumber] IS NOT NULL AND [IdentificationNumber] != ''");

            entity.Property(t => t.SecurityDeposit)
                  .HasPrecision(18, 2);

            entity.Property(t => t.MonthlyRent)
                  .HasPrecision(18, 2);

            entity.Property(t => t.CreatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(t => t.UpdatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            // Configure relationship with Room
            entity.HasOne(t => t.Room)
                  .WithMany(r => r.Tenants)
                  .HasForeignKey(t => t.RoomId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure Invoice entity
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(i => i.InvoiceNumber)
                  .IsUnique()
                  .HasDatabaseName("IX_Invoices_InvoiceNumber");

            entity.HasIndex(i => new { i.TenantId, i.BillingPeriod })
                  .HasDatabaseName("IX_Invoices_TenantId_BillingPeriod");

            entity.Property(i => i.MonthlyRent)
                  .HasPrecision(18, 2);

            entity.Property(i => i.AdditionalCharges)
                  .HasPrecision(18, 2);

            entity.Property(i => i.Discount)
                  .HasPrecision(18, 2);

            entity.Property(i => i.TotalAmount)
                  .HasPrecision(18, 2);

            entity.Property(i => i.PaidAmount)
                  .HasPrecision(18, 2);

            entity.Property(i => i.RemainingBalance)
                  .HasPrecision(18, 2);

            entity.Property(i => i.CreatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(i => i.UpdatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            // Configure relationships
            entity.HasOne(i => i.Tenant)
                  .WithMany(t => t.Invoices)
                  .HasForeignKey(i => i.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Room)
                  .WithMany(r => r.Invoices)
                  .HasForeignKey(i => i.RoomId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure Payment entity
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasIndex(p => p.ReferenceNumber)
                  .HasDatabaseName("IX_Payments_ReferenceNumber")
                  .HasFilter("[ReferenceNumber] IS NOT NULL AND [ReferenceNumber] != ''");

            entity.Property(p => p.Amount)
                  .HasPrecision(18, 2);

            entity.Property(p => p.CreatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            entity.Property(p => p.UpdatedAt)
                  .HasDefaultValueSql("GETUTCDATE()");

            // Configure relationship with Invoice
            entity.HasOne(p => p.Invoice)
                  .WithMany(i => i.Payments)
                  .HasForeignKey(p => p.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed data for room types and statuses (if needed)
        SeedData(modelBuilder);
    }

    /// <summary>
    /// Seeds initial data for the database
    /// </summary>
    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Seed some sample rooms for development
        modelBuilder.Entity<Room>().HasData(
            new Room
            {
                Id = 1,
                RoomNumber = "101",
                Type = RoomType.Single,
                MonthlyRent = 800.00m,
                Status = RoomStatus.Vacant,
                Floor = 1,
                Area = 25.5m,
                Description = "Cozy single room with city view",
                HasAirConditioning = true,
                HasPrivateBathroom = true,
                IsFurnished = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Room
            {
                Id = 2,
                RoomNumber = "102",
                Type = RoomType.Double,
                MonthlyRent = 1200.00m,
                Status = RoomStatus.Vacant,
                Floor = 1,
                Area = 35.0m,
                Description = "Spacious double room with balcony",
                HasAirConditioning = true,
                HasPrivateBathroom = true,
                IsFurnished = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Room
            {
                Id = 3,
                RoomNumber = "201",
                Type = RoomType.Suite,
                MonthlyRent = 1800.00m,
                Status = RoomStatus.Maintenance,
                Floor = 2,
                Area = 55.0m,
                Description = "Luxury suite with separate living area",
                HasAirConditioning = true,
                HasPrivateBathroom = true,
                IsFurnished = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
    }

    /// <summary>
    /// Override SaveChanges to automatically update UpdatedAt timestamps
    /// </summary>
    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    /// <summary>
    /// Override SaveChangesAsync to automatically update UpdatedAt timestamps
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Updates the UpdatedAt property for all modified entities
    /// </summary>
    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity.GetType().GetProperty("UpdatedAt") is not null)
            {
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
            }
        }
    }
}
