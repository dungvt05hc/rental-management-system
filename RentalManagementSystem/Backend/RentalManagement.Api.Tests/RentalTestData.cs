using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Seeding helpers shared by the database-backed test classes.
/// </summary>
public static class RentalTestData
{
    /// <summary>
    /// Empties every table these tests write to and seeds one tenant living in one
    /// room, so each test starts from a known, empty ledger.
    /// </summary>
    public static async Task<(int TenantId, int RoomId)> ResetAndSeedTenantAsync(
        RentalManagementContext context,
        decimal monthlyRent = 1_000m)
    {
        await context.Database.ExecuteSqlRawAsync("""
            TRUNCATE "Payments", "InvoiceItems", "Invoices", "Tenants", "Rooms", "InvoiceNumberCounters"
            RESTART IDENTITY CASCADE;
            """);

        var room = new Room
        {
            RoomNumber = $"R{Guid.NewGuid():N}"[..8],
            MonthlyRent = monthlyRent,
            Floor = 1
        };
        context.Rooms.Add(room);
        await context.SaveChangesAsync();

        var tenant = new Tenant
        {
            FirstName = "Test",
            LastName = "Tenant",
            Email = $"{Guid.NewGuid():N}@example.test",
            IdentificationNumber = Guid.NewGuid().ToString("N"),
            RoomId = room.Id,
            MonthlyRent = monthlyRent,
            IsActive = true
        };
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();

        return (tenant.Id, room.Id);
    }
}
