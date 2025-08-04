using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces
{
    /// <summary>
    /// Interface for database management operations
    /// </summary>
    public interface IDatabaseManagementService
    {
        /// <summary>
        /// Test database connection
        /// </summary>
        Task<bool> TestConnectionAsync();

        /// <summary>
        /// Get sanitized connection string (without password)
        /// </summary>
        Task<string> GetConnectionStringAsync();

        /// <summary>
        /// Check if database exists
        /// </summary>
        Task<bool> DatabaseExistsAsync();

        /// <summary>
        /// Create database
        /// </summary>
        Task CreateDatabaseAsync();

        /// <summary>
        /// Drop database
        /// </summary>
        Task DropDatabaseAsync();

        /// <summary>
        /// Apply pending migrations
        /// </summary>
        Task<bool> ApplyMigrationsAsync();

        /// <summary>
        /// Get list of pending migrations
        /// </summary>
        Task<List<string>> GetPendingMigrationsAsync();

        /// <summary>
        /// Get comprehensive database information
        /// </summary>
        Task<DatabaseInfo> GetDatabaseInfoAsync();

        /// <summary>
        /// Seed database with sample data
        /// </summary>
        Task<bool> SeedDatabaseAsync();

        /// <summary>
        /// Get information about all tables
        /// </summary>
        Task<List<TableInfo>> GetTableInfoAsync();

        /// <summary>
        /// Backup database to specified path
        /// </summary>
        Task<bool> BackupDatabaseAsync(string backupPath);

        /// <summary>
        /// Restore database from backup
        /// </summary>
        Task<bool> RestoreDatabaseAsync(string backupPath);
    }

    /// <summary>
    /// Interface for database seeding operations
    /// </summary>
    public interface IDatabaseSeeder
    {
        /// <summary>
        /// Seed all data
        /// </summary>
        Task SeedAsync();

        /// <summary>
        /// Seed roles
        /// </summary>
        Task SeedRolesAsync();

        /// <summary>
        /// Seed users
        /// </summary>
        Task SeedUsersAsync();

        /// <summary>
        /// Seed rooms
        /// </summary>
        Task SeedRoomsAsync();

        /// <summary>
        /// Seed tenants
        /// </summary>
        Task SeedTenantsAsync();

        /// <summary>
        /// Seed invoices
        /// </summary>
        Task SeedInvoicesAsync();

        /// <summary>
        /// Seed payments
        /// </summary>
        Task SeedPaymentsAsync();
    }
}
