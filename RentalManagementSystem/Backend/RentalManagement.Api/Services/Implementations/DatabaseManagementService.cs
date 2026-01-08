using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Services.Interfaces;
using RentalManagement.Api.Models.DTOs;
using System.Data;
using Npgsql;

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
                var builder = new NpgsqlConnectionStringBuilder(_connectionString);
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
                var connectionStringBuilder = new NpgsqlConnectionStringBuilder(_connectionString);
                
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var info = new DatabaseInfo
                {
                    ServerName = connectionStringBuilder.Host ?? "localhost",
                    DatabaseName = connectionStringBuilder.Database ?? "unknown",
                    IsOnline = connection.State == ConnectionState.Open,
                    Version = connection.ServerVersion
                };

                // Get database size (PostgreSQL)
                var sizeQuery = @"
                    SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS size_mb";

                using var command = new NpgsqlCommand(sizeQuery, connection);
                var size = await command.ExecuteScalarAsync();
                info.SizeInMB = size != DBNull.Value ? Convert.ToInt64(size) : 0;

                // Get table count (PostgreSQL)
                var tableCountQuery = @"
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'";
                
                using var tableCommand = new NpgsqlCommand(tableCountQuery, connection);
                var tableCount = await tableCommand.ExecuteScalarAsync();
                info.TotalTables = tableCount != null ? Convert.ToInt32(tableCount) : 0;

                // Get applied migrations
                var appliedMigrations = await _context.Database.GetAppliedMigrationsAsync();
                info.AppliedMigrations = appliedMigrations.ToList();

                var pendingMigrations = await _context.Database.GetPendingMigrationsAsync();
                info.PendingMigrations = pendingMigrations.ToList();

                // PostgreSQL doesn't have a direct equivalent to sys.databases creation date
                // We'll use the current timestamp as a placeholder
                info.CreatedDate = DateTime.UtcNow;

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
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // PostgreSQL query for table information
                var query = @"
                    SELECT 
                        t.table_name,
                        t.table_schema,
                        COALESCE(s.n_live_tup, 0) as row_count,
                        pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))::bigint / 1024 as size_kb
                    FROM information_schema.tables t
                    LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
                    WHERE t.table_schema = 'public' 
                    AND t.table_type = 'BASE TABLE'
                    ORDER BY t.table_name";

                using var command = new NpgsqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var tables = new List<TableInfo>();
                while (await reader.ReadAsync())
                {
                    tables.Add(new TableInfo
                    {
                        TableName = reader.GetString(0),
                        Schema = reader.GetString(1),
                        RowCount = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetInt64(2)),
                        CreatedDate = DateTime.UtcNow, // PostgreSQL doesn't track table creation date by default
                        SizeInKB = reader.IsDBNull(3) ? 0 : reader.GetInt64(3)
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
        /// Backup database to specified path (PostgreSQL pg_dump)
        /// Note: This requires pg_dump to be installed and accessible in the system PATH
        /// </summary>
        public async Task<bool> BackupDatabaseAsync(string backupPath)
        {
            try
            {
                var connectionStringBuilder = new NpgsqlConnectionStringBuilder(_connectionString);
                var databaseName = connectionStringBuilder.Database;
                var host = connectionStringBuilder.Host;
                var port = connectionStringBuilder.Port;
                var username = connectionStringBuilder.Username;
                var password = connectionStringBuilder.Password;

                // Use pg_dump for PostgreSQL backup
                var processStartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "pg_dump",
                    Arguments = $"-h {host} -p {port} -U {username} -F c -f \"{backupPath}\" {databaseName}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                // Set password as environment variable
                processStartInfo.EnvironmentVariables["PGPASSWORD"] = password;

                using var process = System.Diagnostics.Process.Start(processStartInfo);
                if (process is null)
                {
                    _logger.LogError("Failed to start pg_dump process");
                    return false;
                }

                await process.WaitForExitAsync();

                if (process.ExitCode == 0)
                {
                    _logger.LogInformation("Database backup completed: {BackupPath}", backupPath);
                    return true;
                }
                else
                {
                    var error = await process.StandardError.ReadToEndAsync();
                    _logger.LogError("Database backup failed: {Error}", error);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error backing up database to {BackupPath}", backupPath);
                return false;
            }
        }

        /// <summary>
        /// Restore database from backup (PostgreSQL pg_restore)
        /// Note: This requires pg_restore to be installed and accessible in the system PATH
        /// </summary>
        public async Task<bool> RestoreDatabaseAsync(string backupPath)
        {
            try
            {
                var connectionStringBuilder = new NpgsqlConnectionStringBuilder(_connectionString);
                var databaseName = connectionStringBuilder.Database;
                var host = connectionStringBuilder.Host;
                var port = connectionStringBuilder.Port;
                var username = connectionStringBuilder.Username;
                var password = connectionStringBuilder.Password;

                // Use pg_restore for PostgreSQL restore
                var processStartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "pg_restore",
                    Arguments = $"-h {host} -p {port} -U {username} -d {databaseName} -c \"{backupPath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                // Set password as environment variable
                processStartInfo.EnvironmentVariables["PGPASSWORD"] = password;

                using var process = System.Diagnostics.Process.Start(processStartInfo);
                if (process is null)
                {
                    _logger.LogError("Failed to start pg_restore process");
                    return false;
                }

                await process.WaitForExitAsync();

                if (process.ExitCode == 0)
                {
                    _logger.LogInformation("Database restored from: {BackupPath}", backupPath);
                    return true;
                }
                else
                {
                    var error = await process.StandardError.ReadToEndAsync();
                    _logger.LogError("Database restore failed: {Error}", error);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring database from {BackupPath}", backupPath);
                return false;
            }
        }
    }
}
