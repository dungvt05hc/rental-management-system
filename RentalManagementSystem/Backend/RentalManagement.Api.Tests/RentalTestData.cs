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
    /// Empties every table these tests write to and seeds one customer holding an
    /// active contract on one room, so each test starts from a known, empty ledger.
    /// </summary>
    public static async Task<(int CustomerId, int RoomId, int ContractId)> ResetAndSeedCustomerAsync(
        RentalManagementContext context,
        decimal monthlyRent = 1_000m)
    {
        await context.Database.ExecuteSqlRawAsync("""
            TRUNCATE "Payments", "InvoiceItems", "Invoices", "RentalContracts", "Customers", "Rooms", "InvoiceNumberCounters"
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

        var customer = new Customer
        {
            FirstName = "Test",
            LastName = "Customer",
            Email = $"{Guid.NewGuid():N}@example.test",
            IdentificationNumber = Guid.NewGuid().ToString("N"),
            IsActive = true
        };
        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        var contract = new RentalContract
        {
            CustomerId = customer.Id,
            RoomId = room.Id,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            MonthlyRent = monthlyRent,
            Status = RentalContractStatus.Active
        };
        context.RentalContracts.Add(contract);
        await context.SaveChangesAsync();

        return (customer.Id, room.Id, contract.Id);
    }
}
