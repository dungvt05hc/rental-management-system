using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using RentalManagement.Api.Data;
using RentalManagement.Api.Mappings;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Implementations;
using Testcontainers.PostgreSql;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Verifies the AddInvoiceNumberCounter migration against a database that already
/// holds invoices: existing rows must survive, and the counter must resume from the
/// highest number already issued rather than restarting at 0001.
/// </summary>
public class InvoiceNumberMigrationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    private const string PreCounterMigration = "20260108052328_InitialCreate";

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    private RentalManagementContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<RentalManagementContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        return new RentalManagementContext(options);
    }

    [Fact]
    public async Task Migration_OnDatabaseWithExistingInvoices_KeepsThemAndResumesNumbering()
    {
        int tenantId, roomId;

        // --- Arrange: a database at the schema version that predates the counter ---
        await using (var context = CreateContext())
        {
            var migrator = context.GetService<IMigrator>();
            await migrator.MigrateAsync(PreCounterMigration);

            var room = new Room { RoomNumber = "A101", MonthlyRent = 1_000m, Floor = 1 };
            context.Rooms.Add(room);
            await context.SaveChangesAsync();

            var tenant = new Tenant
            {
                FirstName = "Legacy",
                LastName = "Tenant",
                Email = "legacy@example.test",
                IdentificationNumber = "LEGACY-1",
                RoomId = room.Id,
                MonthlyRent = 1_000m,
                IsActive = true
            };
            context.Tenants.Add(tenant);
            await context.SaveChangesAsync();

            roomId = room.Id;
            tenantId = tenant.Id;

            // Invoices issued by the old COUNT-based generator, including a gap:
            // 0007 is the highest, so the next number has to be 0008.
            var period = DateTime.UtcNow.ToString("yyyyMM");
            foreach (var sequence in new[] { 1, 2, 7 })
            {
                context.Invoices.Add(new Invoice
                {
                    TenantId = tenant.Id,
                    RoomId = room.Id,
                    InvoiceNumber = $"INV-{period}-{sequence:D4}",
                    MonthlyRent = 1_000m,
                    TotalAmount = 1_000m,
                    RemainingBalance = 1_000m,
                    BillingPeriod = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
                    IssueDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(15),
                    Status = InvoiceStatus.Issued
                });
            }

            await context.SaveChangesAsync();
        }

        // --- Act: apply the counter migration on top of that data ---
        await using (var context = CreateContext())
        {
            await context.Database.MigrateAsync();
        }

        // --- Assert: nothing lost, and numbering continues where it left off ---
        await using (var context = CreateContext())
        {
            var existing = await context.Invoices.Select(i => i.InvoiceNumber).ToListAsync();
            Assert.Equal(3, existing.Count);

            var currentPeriod = DateTime.UtcNow.ToString("yyyyMM");
            var counter = await context.InvoiceNumberCounters.SingleAsync(c => c.Period == currentPeriod);
            Assert.Equal(7, counter.LastValue);
        }

        await using (var context = CreateContext())
        {
            var mapper = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();
            var service = new InvoiceService(context, mapper, NullLogger<InvoiceService>.Instance);

            var result = await service.CreateInvoiceAsync(new CreateInvoiceDto
            {
                TenantId = tenantId,
                RoomId = roomId,
                BillingPeriod = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                DueDate = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            });

            Assert.True(result.Success, result.Message);
            Assert.Equal($"INV-{DateTime.UtcNow:yyyyMM}-0008", result.Data!.InvoiceNumber);
        }
    }
}
