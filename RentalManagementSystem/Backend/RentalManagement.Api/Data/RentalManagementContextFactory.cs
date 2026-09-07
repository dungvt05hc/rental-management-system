using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RentalManagement.Api.Data;

/// <summary>
/// Design-time factory for creating DbContext instances for EF Core tools
/// </summary>
public class RentalManagementContextFactory : IDesignTimeDbContextFactory<RentalManagementContext>
{
    public RentalManagementContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<RentalManagementContext>();
        
        // DATABASE_URL is set by ./dev.sh. The fallback carries no password: it is
        // enough for offline commands like `migrations add`, but anything that
        // reaches the database needs the real value.
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5433;Database=rental_management;Username=admin;Include Error Detail=true";

        optionsBuilder.UseNpgsql(connectionString);
        
        return new RentalManagementContext(optionsBuilder.Options);
    }
}
