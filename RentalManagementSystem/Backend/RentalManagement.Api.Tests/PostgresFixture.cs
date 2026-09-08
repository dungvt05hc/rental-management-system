using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using Testcontainers.PostgreSql;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Runs a throwaway PostgreSQL container for the test class.
/// These tests exercise row locking, ON CONFLICT and transaction rollback, none of
/// which the in-memory provider emulates, so a real server is required.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    /// <summary>
    /// Builds a context configured the way Program.cs configures the real one,
    /// retry-on-failure included, so tests hit the same execution-strategy path
    /// as production.
    /// </summary>
    public RentalManagementContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<RentalManagementContext>()
            .UseNpgsql(ConnectionString, npgsql =>
            {
                npgsql.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
                npgsql.CommandTimeout(30);
            })
            .Options;

        return new RentalManagementContext(options);
    }
}
