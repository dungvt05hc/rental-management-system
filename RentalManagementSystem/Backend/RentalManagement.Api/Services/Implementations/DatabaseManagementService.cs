using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Services.Interfaces;
using RentalManagement.Api.Models.DTOs;
using System.Data;
using Microsoft.Data.SqlClient;

namespace RentalManagement.Api.Services.Implementations
{
    /// <summary>
    /// Implementation of database management services
    /// Provides comprehensive database operations including backup, restore, migrations, and monitoring
    /// </summary>
    public class DatabaseManagementService : IDatabaseManagementService
    {
        private readonly RentalManagementContext _context;
        private readonly IDatabaseSeeder _seeder;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseManagementService> _logger;
        private readonly string _connectionString;

        public DatabaseManagementService(
            RentalManagementContext context,
            IDatabaseSeeder seeder,
            IConfiguration configuration,
            ILogger<DatabaseManagementService> logger)
        {
            _context = context;
            _seeder = seeder;
            _configuration = configuration;
            _logger = logger;
            _connectionString = _configuration.GetConnectionString("DefaultConnection")!;
        }

        /// <summary>
        /// Test database connection
        /// </summary>
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

        /// <summary>
        /// Get sanitized connection string (without password)
        /// </summary>
        public Task<string> GetConnectionStringAsync()
        {
            try
            {
                var builder = new SqlConnectionStringBuilder(_connectionString);
                // Remove password for security
                builder.Password = "";
                return Task.FromResult(builder.ConnectionString);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection string");
                return Task.FromResult("Connection string not available");
            }
        }

        /// <summary>
        /// Check if database exists
        /// </summary>
        public async Task<bool> DatabaseExistsAsync()
        {
            try
            {
                return await _context.Database.CanConnectAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking database existence");
                return false;
            }
        }

        /// <summary>
        /// Create database
        /// </summary>
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

        /// <summary>
        /// Drop database
        /// </summary>
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

        /// <summary>
        /// Apply pending migrations
        /// </summary>
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

        /// <summary>
        /// Get list of pending migrations
        /// </summary>
        public async Task<List<string>> GetPendingMigrationsAsync()
        {
            try
            {
                var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
                return pendingMigrations.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending migrations");
                return new List<string>();
            }
        }

        /// <summary>
        /// Get comprehensive database information
        /// </summary>
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
                    IsOnline = connection.State == ConnectionState.Open,
                    Version = connection.ServerVersion
                };

                // Get database size
                var sizeQuery = @"
                    SELECT 
                        SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8192.) / 1024 / 1024 AS SizeMB
                    FROM sys.database_files 
                    WHERE type = 0";

                using var command = new SqlCommand(sizeQuery, connection);
                var size = await command.ExecuteScalarAsync();
                info.SizeInMB = size != DBNull.Value ? Convert.ToInt64(size) : 0;

                // Get table count
                var tableCountQuery = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
                using var tableCommand = new SqlCommand(tableCountQuery, connection);
                var tableCount = await tableCommand.ExecuteScalarAsync();
                info.TotalTables = tableCount != null ? Convert.ToInt32(tableCount) : 0;

                // Get applied migrations
                var appliedMigrations = await _context.Database.GetAppliedMigrationsAsync();
                info.AppliedMigrations = appliedMigrations.ToList();

                var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
                info.PendingMigrations = pendingMigrations.ToList();

                // Get database creation date
                var creationDateQuery = "SELECT create_date FROM sys.databases WHERE name = @dbName";
                using var dateCommand = new SqlCommand(creationDateQuery, connection);
                dateCommand.Parameters.AddWithValue("@dbName", connectionStringBuilder.InitialCatalog);
                var creationDate = await dateCommand.ExecuteScalarAsync();
                info.CreatedDate = creationDate != DBNull.Value ? Convert.ToDateTime(creationDate) : DateTime.MinValue;

                return info;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database info");
                throw;
            }
        }

        /// <summary>
        /// Seed database with sample data
        /// </summary>
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

        /// <summary>
        /// Get information about all tables
        /// </summary>
        public async Task<List<TableInfo>> GetTableInfoAsync()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                var query = @"
                    SELECT 
                        t.TABLE_NAME,
                        t.TABLE_SCHEMA,
                        p.rows as RowCount
                    FROM INFORMATION_SCHEMA.TABLES t
                    LEFT JOIN (
                        SELECT 
                            OBJECT_NAME(OBJECT_ID) AS TableName,
                            SUM(rows) AS rows
                        FROM sys.partitions 
                        WHERE index_id < 2 
                        GROUP BY OBJECT_ID
                    ) p ON t.TABLE_NAME = p.TableName
                    WHERE t.TABLE_TYPE = 'BASE TABLE'
                    ORDER BY t.TABLE_NAME";

                using var command = new SqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var tables = new List<TableInfo>();
                while (await reader.ReadAsync())
                {
                    tables.Add(new TableInfo
                    {
                        TableName = reader.GetString("TABLE_NAME"),
                        Schema = reader.GetString("TABLE_SCHEMA"),
                        RowCount = reader.IsDBNull("RowCount") ? 0 : Convert.ToInt32(reader["RowCount"]),
                        CreatedDate = DateTime.Now, // Placeholder - would need more complex query for actual creation date
                        SizeInKB = 0 // Placeholder - would need more complex query for table size
                    });
                }

                return tables;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting table info");
                return new List<TableInfo>();
            }
        }

        /// <summary>
        /// Backup database to specified path
        /// </summary>
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
                    TO DISK = @backupPath 
                    WITH FORMAT, COMPRESSION";

                using var command = new SqlCommand(backupQuery, connection);
                command.Parameters.AddWithValue("@backupPath", backupPath);
                command.CommandTimeout = 300; // 5 minutes timeout

                await command.ExecuteNonQueryAsync();
                _logger.LogInformation("Database backup completed: {BackupPath}", backupPath);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error backing up database to {BackupPath}", backupPath);
                return false;
            }
        }

        /// <summary>
        /// Restore database from backup
        /// </summary>
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

                // Set database to single user mode
                var singleUserQuery = $"ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE";
                using var singleUserCommand = new SqlCommand(singleUserQuery, connection);
                await singleUserCommand.ExecuteNonQueryAsync();

                // Restore database
                var restoreQuery = $@"
                    RESTORE DATABASE [{databaseName}] 
                    FROM DISK = @backupPath 
                    WITH REPLACE";

                using var command = new SqlCommand(restoreQuery, connection);
                command.Parameters.AddWithValue("@backupPath", backupPath);
                command.CommandTimeout = 600; // 10 minutes timeout

                await command.ExecuteNonQueryAsync();

                // Set database back to multi user mode
                var multiUserQuery = $"ALTER DATABASE [{databaseName}] SET MULTI_USER";
                using var multiUserCommand = new SqlCommand(multiUserQuery, connection);
                await multiUserCommand.ExecuteNonQueryAsync();

                _logger.LogInformation("Database restored from: {BackupPath}", backupPath);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring database from {BackupPath}", backupPath);
                return false;
            }
        }
    }
}
