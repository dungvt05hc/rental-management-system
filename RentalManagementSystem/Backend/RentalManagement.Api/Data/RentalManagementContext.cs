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

    /// <summary>
    /// Invoice line items
    /// </summary>
    public DbSet<InvoiceItem> InvoiceItems { get; set; } = null!;

    /// <summary>
    /// Reusable items that can be added to invoices
    /// </summary>
    public DbSet<Item> Items { get; set; } = null!;

    /// <summary>
    /// Supported languages
    /// </summary>
    public DbSet<Language> Languages { get; set; } = null!;

    /// <summary>
    /// Translations for localization
    /// </summary>
    public DbSet<Translation> Translations { get; set; } = null!;

    /// <summary>
    /// System settings and configuration
    /// </summary>
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;

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
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(r => r.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
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
                  .HasFilter("\"IdentificationNumber\" IS NOT NULL AND \"IdentificationNumber\" != ''");

            entity.Property(t => t.SecurityDeposit)
                  .HasPrecision(18, 2);

            entity.Property(t => t.MonthlyRent)
                  .HasPrecision(18, 2);

            entity.Property(t => t.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(t => t.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(i => i.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

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
                  .HasFilter("\"ReferenceNumber\" IS NOT NULL AND \"ReferenceNumber\" != ''");

            entity.Property(p => p.Amount)
                  .HasPrecision(18, 2);

            entity.Property(p => p.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(p => p.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            // Configure relationship with Invoice
            entity.HasOne(p => p.Invoice)
                  .WithMany(i => i.Payments)
                  .HasForeignKey(p => p.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure InvoiceItem entity
        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.HasIndex(ii => new { ii.InvoiceId, ii.LineNumber })
                  .HasDatabaseName("IX_InvoiceItems_InvoiceId_LineNumber");

            entity.Property(ii => ii.Quantity)
                  .HasPrecision(18, 3);

            entity.Property(ii => ii.UnitPrice)
                  .HasPrecision(18, 2);

            entity.Property(ii => ii.DiscountPercent)
                  .HasPrecision(5, 2);

            entity.Property(ii => ii.DiscountAmount)
                  .HasPrecision(18, 2);

            entity.Property(ii => ii.TaxPercent)
                  .HasPrecision(5, 2);

            entity.Property(ii => ii.TaxAmount)
                  .HasPrecision(18, 2);

            entity.Property(ii => ii.LineTotal)
                  .HasPrecision(18, 2);

            entity.Property(ii => ii.LineTotalWithTax)
                  .HasPrecision(18, 2);

            entity.Property(ii => ii.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(ii => ii.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            // Configure relationship with Invoice
            entity.HasOne(ii => ii.Invoice)
                  .WithMany(i => i.InvoiceItems)
                  .HasForeignKey(ii => ii.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Item entity
        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasIndex(i => i.ItemCode)
                  .IsUnique()
                  .HasDatabaseName("IX_Items_ItemCode");

            entity.HasIndex(i => i.Category)
                  .HasDatabaseName("IX_Items_Category");

            entity.Property(i => i.UnitPrice)
                  .HasPrecision(18, 2);

            entity.Property(i => i.TaxPercent)
                  .HasPrecision(5, 2);

            entity.Property(i => i.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(i => i.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        // Configure Language entity
        modelBuilder.Entity<Language>(entity =>
        {
            entity.HasIndex(l => l.Code)
                  .IsUnique()
                  .HasDatabaseName("IX_Languages_Code");

            entity.Property(l => l.Code)
                  .HasMaxLength(10);

            entity.Property(l => l.Name)
                  .HasMaxLength(100);

            entity.Property(l => l.NativeName)
                  .HasMaxLength(100);

            entity.Property(l => l.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        // Configure Translation entity
        modelBuilder.Entity<Translation>(entity =>
        {
            entity.HasIndex(t => new { t.LanguageId, t.Key })
                  .IsUnique()
                  .HasDatabaseName("IX_Translations_LanguageId_Key");

            entity.HasIndex(t => t.Category)
                  .HasDatabaseName("IX_Translations_Category");

            entity.Property(t => t.Key)
                  .HasMaxLength(255);

            entity.Property(t => t.Category)
                  .HasMaxLength(50);

            entity.Property(t => t.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(t => t.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            // Configure relationship with Language
            entity.HasOne(t => t.Language)
                  .WithMany(l => l.Translations)
                  .HasForeignKey(t => t.LanguageId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure SystemSetting entity
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.HasIndex(s => s.Key)
                  .IsUnique()
                  .HasDatabaseName("IX_SystemSettings_Key");

            entity.HasIndex(s => s.Category)
                  .HasDatabaseName("IX_SystemSettings_Category");

            entity.Property(s => s.Key)
                  .HasMaxLength(255);

            entity.Property(s => s.Category)
                  .HasMaxLength(50);

            entity.Property(s => s.DataType)
                  .HasMaxLength(50);

            entity.Property(s => s.CreatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            entity.Property(s => s.UpdatedAt)
                  .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        });

        // Seed data for room types and statuses (if needed)
        SeedData(modelBuilder);
    }

    /// <summary>
    /// Seeds initial data for the database
    /// </summary>
    private static void SeedData(ModelBuilder modelBuilder)
    {
        // Use a static date for seed data to avoid migration issues
        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        
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
                CreatedAt = seedDate,
                UpdatedAt = seedDate
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
                CreatedAt = seedDate,
                UpdatedAt = seedDate
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
                CreatedAt = seedDate,
                UpdatedAt = seedDate
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
