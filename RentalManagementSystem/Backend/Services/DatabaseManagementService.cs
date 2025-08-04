using Microsoft.EntityFrameworkCore;
using RentalManagementSystem.Data;
using System.Data;
using Microsoft.Data.SqlClient;

namespace RentalManagementSystem.Services
{
    public interface IDatabaseManagementService
    {
        Task<bool> TestConnectionAsync();
        Task<string> GetConnectionStringAsync();
        Task<bool> DatabaseExistsAsync();
        Task CreateDatabaseAsync();
        Task DropDatabaseAsync();
        Task<bool> ApplyMigrationsAsync();
        Task<List<string>> GetPendingMigrationsAsync();
        Task<DatabaseInfo> GetDatabaseInfoAsync();
        Task<bool> SeedDatabaseAsync();
        Task<List<TableInfo>> GetTableInfoAsync();
        Task<bool> BackupDatabaseAsync(string backupPath);
        Task<bool> RestoreDatabaseAsync(string backupPath);
    }

    public class DatabaseManagementService : IDatabaseManagementService
    {
        private readonly RentalManagementContext _context;
        private readonly DatabaseSeeder _seeder;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseManagementService> _logger;
        private readonly string _connectionString;

        public DatabaseManagementService(
            RentalManagementContext context,
            DatabaseSeeder seeder,
            IConfiguration configuration,
            ILogger<DatabaseManagementService> logger)
        {
            _context = context;
            _seeder = seeder;
            _configuration = configuration;
            _logger = logger;
            _connectionString = _configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                await _context.Database.OpenConnectionAsync();
                await _context.Database.CloseConnectionAsync();
                _logger.LogInformation("Database connection test successful");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed");
                return false;
            }
        }

        public async Task<string> GetConnectionStringAsync()
        {
            await Task.CompletedTask;
            // Return connection string without password for security
            var builder = new SqlConnectionStringBuilder(_connectionString);
            var safeConnectionString = $"Server={builder.DataSource};Database={builder.InitialCatalog};Trusted_Connection={builder.IntegratedSecurity};";
            return safeConnectionString;
        }

        public async Task<bool> DatabaseExistsAsync()
        {
            try
            {
                return await _context.Database.CanConnectAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if database exists");
                return false;
            }
        }

        public async Task CreateDatabaseAsync()
        {
            try
            {
                await _context.Database.EnsureCreatedAsync();
                _logger.LogInformation("Database created successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating database");
                throw;
            }
        }

        public async Task DropDatabaseAsync()
        {
            try
            {
                await _context.Database.EnsureDeletedAsync();
                _logger.LogInformation("Database dropped successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dropping database");
                throw;
            }
        }

        public async Task<bool> ApplyMigrationsAsync()
        {
            try
            {
                await _context.Database.MigrateAsync();
                _logger.LogInformation("Migrations applied successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying migrations");
                return false;
            }
        }

        public async Task<List<string>> GetPendingMigrationsAsync()
        {
            try
            {
                var pending = await _context.Database.GetPendingMigrationsAsync();
                return pending.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending migrations");
                return new List<string>();
            }
        }

        public async Task<DatabaseInfo> GetDatabaseInfoAsync()
        {
            try
            {
                var connectionStringBuilder = new SqlConnectionStringBuilder(_connectionString);
                
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                var info = new DatabaseInfo
                {
                    ServerName = connectionStringBuilder.DataSource,
                    DatabaseName = connectionStringBuilder.InitialCatalog,
                    IsConnected = connection.State == ConnectionState.Open,
                    ServerVersion = connection.ServerVersion
                };

                // Get database size
                var sizeQuery = @"
                    SELECT 
                        SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8192.) / 1024 / 1024 AS SizeMB
                    FROM sys.database_files 
                    WHERE type = 0";

                using var command = new SqlCommand(sizeQuery, connection);
                var size = await command.ExecuteScalarAsync();
                info.SizeMB = size != DBNull.Value ? Convert.ToDouble(size) : 0;

                // Get table count
                var tableCountQuery = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
                using var tableCommand = new SqlCommand(tableCountQuery, connection);
                info.TableCount = (int)await tableCommand.ExecuteScalarAsync();

                // Get applied migrations
                var appliedMigrations = await _context.Database.GetAppliedMigrationsAsync();
                info.AppliedMigrations = appliedMigrations.ToList();

                var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
                info.PendingMigrations = pendingMigrations.ToList();

                return info;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database info");
                throw;
            }
        }

        public async Task<bool> SeedDatabaseAsync()
        {
            try
            {
                await _seeder.SeedAsync();
                _logger.LogInformation("Database seeded successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding database");
                return false;
            }
        }

        public async Task<List<TableInfo>> GetTableInfoAsync()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    SELECT 
                        t.TABLE_NAME,
                        t.TABLE_TYPE,
                        ISNULL(p.rows, 0) as RowCount
                    FROM INFORMATION_SCHEMA.TABLES t
                    LEFT JOIN (
                        SELECT 
                            o.name AS table_name,
                            SUM(p.rows) AS rows
                        FROM sys.objects o
                        INNER JOIN sys.partitions p ON o.object_id = p.object_id
                        WHERE o.type = 'U'
                        AND p.index_id IN (0, 1)
                        GROUP BY o.name
                    ) p ON t.TABLE_NAME = p.table_name
                    WHERE t.TABLE_TYPE = 'BASE TABLE'
                    ORDER BY t.TABLE_NAME";

                using var command = new SqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var tables = new List<TableInfo>();
                while (await reader.ReadAsync())
                {
                    tables.Add(new TableInfo
                    {
                        Name = reader.GetString("TABLE_NAME"),
                        Type = reader.GetString("TABLE_TYPE"),
                        RowCount = reader.GetInt32("RowCount")
                    });
                }

                return tables;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting table info");
                throw;
            }
        }

        public async Task<bool> BackupDatabaseAsync(string backupPath)
        {
            try
            {
                var connectionStringBuilder = new SqlConnectionStringBuilder(_connectionString);
                var databaseName = connectionStringBuilder.InitialCatalog;

                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                var backupQuery = $@"
                    BACKUP DATABASE [{databaseName}] 
                    TO DISK = '{backupPath}' 
                    WITH FORMAT, INIT";

                using var command = new SqlCommand(backupQuery, connection);
                command.CommandTimeout = 300; // 5 minutes timeout
                await command.ExecuteNonQueryAsync();

                _logger.LogInformation($"Database backup completed: {backupPath}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error backing up database to {backupPath}");
                return false;
            }
        }

        public async Task<bool> RestoreDatabaseAsync(string backupPath)
        {
            try
            {
                var connectionStringBuilder = new SqlConnectionStringBuilder(_connectionString);
                var databaseName = connectionStringBuilder.InitialCatalog;

                // Connect to master database to restore
                connectionStringBuilder.InitialCatalog = "master";
                using var connection = new SqlConnection(connectionStringBuilder.ConnectionString);
                await connection.OpenAsync();

                // Set database to single user mode and restore
                var restoreQuery = $@"
                    ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    RESTORE DATABASE [{databaseName}] 
                    FROM DISK = '{backupPath}' 
                    WITH REPLACE;
                    ALTER DATABASE [{databaseName}] SET MULTI_USER;";

                using var command = new SqlCommand(restoreQuery, connection);
                command.CommandTimeout = 300; // 5 minutes timeout
                await command.ExecuteNonQueryAsync();

                _logger.LogInformation($"Database restored from: {backupPath}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error restoring database from {backupPath}");
                return false;
            }
        }
    }

    public class DatabaseInfo
    {
        public string ServerName { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public bool IsConnected { get; set; }
        public string ServerVersion { get; set; } = string.Empty;
        public double SizeMB { get; set; }
        public int TableCount { get; set; }
        public List<string> AppliedMigrations { get; set; } = new();
        public List<string> PendingMigrations { get; set; } = new();
    }

    public class TableInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int RowCount { get; set; }
    }
}
