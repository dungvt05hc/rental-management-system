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
        
        // Use connection string from environment variable or default
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=rental_management;Username=admin;Password=123456aA;Include Error Detail=true";
        
        optionsBuilder.UseNpgsql(connectionString);
        
        return new RentalManagementContext(optionsBuilder.Options);
    }
}
