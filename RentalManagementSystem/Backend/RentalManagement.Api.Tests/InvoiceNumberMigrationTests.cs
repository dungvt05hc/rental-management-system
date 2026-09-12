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
        int customerId, roomId;

        // --- Arrange: a database at the schema version that predates the counter ---
        // At this point the schema still calls the table "Tenants" and the rental terms
        // still live on it, so the rows go in as raw SQL rather than through the
        // current model, which describes a schema this database has not reached yet.
        await using (var context = CreateContext())
        {
            var migrator = context.GetService<IMigrator>();
            await migrator.MigrateAsync(PreCounterMigration);

            var period = DateTime.UtcNow.ToString("yyyyMM");

            await context.Database.ExecuteSqlRawAsync($"""
                INSERT INTO "Rooms" ("RoomNumber","Type","MonthlyRent","Status","Floor","Description",
                                     "HasAirConditioning","HasPrivateBathroom","IsFurnished","CreatedAt","UpdatedAt")
                VALUES ('A101',1,1000,2,1,'',false,false,false,NOW(),NOW());

                INSERT INTO "Tenants" ("FirstName","LastName","Email","PhoneNumber","IdentificationNumber",
                                       "EmergencyContactName","EmergencyContactPhone","RoomId",
                                       "ContractStartDate","ContractEndDate","SecurityDeposit","MonthlyRent",
                                       "IsActive","Notes","CreatedAt","UpdatedAt")
                SELECT 'Legacy','Customer','legacy@example.test','0900000000','LEGACY-1','','',
                       r."Id", NOW() - INTERVAL '1 month', NULL, 0, 1000, true, '', NOW(), NOW()
                FROM "Rooms" r WHERE r."RoomNumber" = 'A101';

                -- Invoices issued by the old COUNT-based generator, including a gap:
                -- 0007 is the highest, so the next number has to be 0008.
                INSERT INTO "Invoices" ("InvoiceNumber","TenantId","RoomId","MonthlyRent","AdditionalCharges",
                                        "Discount","TotalAmount","PaidAmount","RemainingBalance","Status",
                                        "BillingPeriod","IssueDate","DueDate","AdditionalChargesDescription",
                                        "Notes","CreatedAt","UpdatedAt")
                SELECT 'INV-{period}-' || LPAD(s::text, 4, '0'), t."Id", t."RoomId", 1000, 0, 0, 1000, 0, 1000, 2,
                       TIMESTAMPTZ '2026-09-01 00:00:00+00', NOW(), NOW() + INTERVAL '15 days', '', '', NOW(), NOW()
                FROM "Tenants" t, (VALUES (1),(2),(7)) AS v(s)
                WHERE t."Email" = 'legacy@example.test';
                """);
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

            // The rename migration carried the legacy tenant across as a customer,
            // and turned their room assignment into an active contract.
            var customer = await context.Customers.SingleAsync(c => c.Email == "legacy@example.test");
            var contract = await context.RentalContracts.SingleAsync(c => c.CustomerId == customer.Id);
            Assert.Equal(RentalContractStatus.Active, contract.Status);

            customerId = customer.Id;
            roomId = contract.RoomId;

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
                CustomerId = customerId,
                RoomId = roomId,
                BillingPeriod = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
                DueDate = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            });

            Assert.True(result.Success, result.Message);
            Assert.Equal($"INV-{DateTime.UtcNow:yyyyMM}-0008", result.Data!.InvoiceNumber);
        }
    }
}
