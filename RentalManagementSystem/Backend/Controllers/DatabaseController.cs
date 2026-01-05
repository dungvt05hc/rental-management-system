using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagementSystem.Services;
using RentalManagementSystem.DTOs;

namespace RentalManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    //[Authorize(Roles = "Admin")]
    public class DatabaseController : ControllerBase
    {
        private readonly IDatabaseManagementService _databaseService;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(
            IDatabaseManagementService databaseService,
            ILogger<DatabaseController> logger)
        {
            _databaseService = databaseService;
            _logger = logger;
        }

        /// <summary>
        /// Test database connection
        /// </summary>
        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var isConnected = await _databaseService.TestConnectionAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = isConnected,
                    Message = isConnected ? "Database connection successful" : "Database connection failed",
                    Data = new { IsConnected = isConnected }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing database connection");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error testing database connection",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Get database connection string (sanitized)
        /// </summary>
        [HttpGet("connection-string")]
        public async Task<IActionResult> GetConnectionString()
        {
            try
            {
                var connectionString = await _databaseService.GetConnectionStringAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new { ConnectionString = connectionString }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection string");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error getting connection string",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Check if database exists
        /// </summary>
        [HttpGet("exists")]
        public async Task<IActionResult> DatabaseExists()
        {
            try
            {
                var exists = await _databaseService.DatabaseExistsAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new { Exists = exists }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if database exists");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error checking database existence",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Create database
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateDatabase()
        {
            try
            {
                await _databaseService.CreateDatabaseAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Database created successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error creating database",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Drop database (DANGER: This will delete all data!)
        /// </summary>
        [HttpDelete("drop")]
        public async Task<IActionResult> DropDatabase([FromQuery] bool confirm = false)
        {
            if (!confirm)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Database drop operation requires explicit confirmation. Add ?confirm=true to the request."
                });
            }

            try
            {
                await _databaseService.DropDatabaseAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Database dropped successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dropping database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error dropping database",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Apply pending migrations
        /// </summary>
        [HttpPost("migrate")]
        public async Task<IActionResult> ApplyMigrations()
        {
            try
            {
                var success = await _databaseService.ApplyMigrationsAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = success,
                    Message = success ? "Migrations applied successfully" : "Failed to apply migrations"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error applying migrations");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error applying migrations",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Get pending migrations
        /// </summary>
        [HttpGet("pending-migrations")]
        public async Task<IActionResult> GetPendingMigrations()
        {
            try
            {
                var migrations = await _databaseService.GetPendingMigrationsAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new { PendingMigrations = migrations }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending migrations");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error getting pending migrations",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Get comprehensive database information
        /// </summary>
        [HttpGet("info")]
        public async Task<IActionResult> GetDatabaseInfo()
        {
            try
            {
                var info = await _databaseService.GetDatabaseInfoAsync();
                return Ok(new ApiResponse<DatabaseInfo>
                {
                    Success = true,
                    Data = info
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting database info");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error getting database information",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Seed database with sample data
        /// </summary>
        [HttpPost("seed")]
        public async Task<IActionResult> SeedDatabase()
        {
            try
            {
                var success = await _databaseService.SeedDatabaseAsync();
                return Ok(new ApiResponse<object>
                {
                    Success = success,
                    Message = success ? "Database seeded successfully" : "Failed to seed database"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error seeding database",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Get information about all tables
        /// </summary>
        [HttpGet("tables")]
        public async Task<IActionResult> GetTableInfo()
        {
            try
            {
                var tables = await _databaseService.GetTableInfoAsync();
                return Ok(new ApiResponse<List<TableInfo>>
                {
                    Success = true,
                    Data = tables
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting table info");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error getting table information",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Backup database
        /// </summary>
        [HttpPost("backup")]
        public async Task<IActionResult> BackupDatabase([FromBody] BackupRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.BackupPath))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Backup path is required"
                    });
                }

                var success = await _databaseService.BackupDatabaseAsync(request.BackupPath);
                return Ok(new ApiResponse<object>
                {
                    Success = success,
                    Message = success ? "Database backup completed successfully" : "Database backup failed"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error backing up database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error backing up database",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Restore database from backup
        /// </summary>
        [HttpPost("restore")]
        public async Task<IActionResult> RestoreDatabase([FromBody] RestoreRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.BackupPath))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Backup path is required"
                    });
                }

                if (!request.Confirm)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Database restore operation requires explicit confirmation. Set confirm=true in the request."
                    });
                }

                var success = await _databaseService.RestoreDatabaseAsync(request.BackupPath);
                return Ok(new ApiResponse<object>
                {
                    Success = success,
                    Message = success ? "Database restored successfully" : "Database restore failed"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error restoring database",
                    Errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Initialize database (create + migrate + seed)
        /// </summary>
        [HttpPost("initialize")]
        public async Task<IActionResult> InitializeDatabase()
        {
            try
            {
                var steps = new List<string>();
                var errors = new List<string>();

                // Check if database exists
                var exists = await _databaseService.DatabaseExistsAsync();
                if (!exists)
                {
                    await _databaseService.CreateDatabaseAsync();
                    steps.Add("Database created");
                }

                // Apply migrations
                var migrateSuccess = await _databaseService.ApplyMigrationsAsync();
                if (migrateSuccess)
                {
                    steps.Add("Migrations applied");
                }
                else
                {
                    errors.Add("Failed to apply migrations");
                }

                // Seed database
                var seedSuccess = await _databaseService.SeedDatabaseAsync();
                if (seedSuccess)
                {
                    steps.Add("Database seeded");
                }
                else
                {
                    errors.Add("Failed to seed database");
                }

                return Ok(new ApiResponse<object>
                {
                    Success = errors.Count == 0,
                    Message = errors.Count == 0 ? "Database initialized successfully" : "Database initialization completed with errors",
                    Data = new { Steps = steps, Errors = errors }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing database");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error initializing database",
                    Errors = new[] { ex.Message }
                });
            }
        }
    }

    public class BackupRequest
    {
        public string BackupPath { get; set; } = string.Empty;
    }

    public class RestoreRequest
    {
        public string BackupPath { get; set; } = string.Empty;
        public bool Confirm { get; set; }
    }
}
