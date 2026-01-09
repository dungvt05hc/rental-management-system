# PostgreSQL Migration Guide

This guide covers migrating from SQL Server to PostgreSQL for the Rental Management System.

## Overview

We're migrating from Microsoft SQL Server to PostgreSQL to:
- Reduce hosting costs (use free tier PostgreSQL services like Supabase)
- Improve cross-platform compatibility
- Enable cloud deployment (Google Cloud Run, Azure, etc.)
- Use open-source database solution

---

## 🚨 Important: Supabase & Cloud Run Connection Issues

### Problem Overview

When deploying a .NET application to serverless platforms (like Google Cloud Run) with Supabase PostgreSQL, you may encounter connection string issues where Entity Framework Core receives an empty or corrupted connection string, resulting in:

```
System.ArgumentException: Format of the initialization string does not conform to specification starting at index 0.
```

### Root Cause

The issue occurs due to several factors:

1. **Transaction Pooler Timeouts**: Supabase's Transaction Pooler (port 6543) is optimized for short-lived serverless connections but can timeout during longer operations like EF Core migrations
2. **Environment Variable Handling**: Connection strings from environment variables may not be properly captured in the DbContext registration lifecycle
3. **URI Format Compatibility**: PostgreSQL URI format (`postgresql://...`) may not be directly compatible with Npgsql connection string format

### ✅ Solutions

#### Solution 1: Use Direct Connection for Migrations (Recommended)

For running Entity Framework migrations, always use the **Direct Connection** (Session mode, port 5432) instead of the Transaction Pooler:

```bash
# Direct Connection Format (for migrations)
Host=db.[project-ref].supabase.co;Port=5432;Database=postgres;Username=postgres;Password=[password];SSL Mode=Require;Trust Server Certificate=true

# Transaction Pooler Format (for runtime)
Host=aws-0-[region].pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.[project-ref];Password=[password];SSL Mode=Require;Trust Server Certificate=true
```

**Why this works:**
- Direct connection (port 5432) has longer timeouts suitable for migrations
- Transaction Pooler (port 6543) is better for serverless runtime API calls

**Running migrations with direct connection:**

```bash
# Set environment variable
export DATABASE_URL="Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"

# Navigate to API project
cd RentalManagementSystem/Backend/RentalManagement.Api

# Run migrations
dotnet ef database update
```

#### Solution 2: Use Design-Time DbContext Factory

Create a design-time factory to ensure EF Core tools can properly access the connection string:

```csharp
// Data/RentalManagementContextFactory.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RentalManagement.Api.Data;

public class RentalManagementContextFactory : IDesignTimeDbContextFactory<RentalManagementContext>
{
    public RentalManagementContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<RentalManagementContext>();
        
        // Read from environment variable
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? "Host=localhost;Port=5432;Database=rental_management;Username=admin;Password=123456aA;Include Error Detail=true";
        
        optionsBuilder.UseNpgsql(connectionString);
        
        return new RentalManagementContext(optionsBuilder.Options);
    }
}
```

#### Solution 3: Static Connection String Storage (For Cloud Run)

In `Program.cs`, use static storage to prevent connection string loss during dependency injection:

```csharp
// At the end of Program.cs
public static class StaticConnectionString
{
    public static string Value { get; set; } = string.Empty;
}

// In startup configuration
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Validate and store
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Database connection string not configured");
}

StaticConnectionString.Value = connectionString;

// Register DbContext with factory
builder.Services.AddDbContext<RentalManagementContext>((serviceProvider, options) =>
{
    var connStr = StaticConnectionString.Value;
    if (string.IsNullOrWhiteSpace(connStr))
    {
        throw new InvalidOperationException("Connection string is null in DbContext factory");
    }
    options.UseNpgsql(connStr);
});
```

#### Solution 4: Add Connection String to appsettings.Production.json

As a fallback, include the properly formatted connection string in `appsettings.Production.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"
  }
}
```

**Note:** For production, always prefer environment variables over hardcoded strings.

### Connection String Format Comparison

| Format | Use Case | Port | Example |
|--------|----------|------|---------|
| **Npgsql Format** | .NET EF Core | 5432/6543 | `Host=db.xxx.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=xxx;SSL Mode=Require` |
| **PostgreSQL URI** | Node.js, Python | 5432/6543 | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |

### Deployment Configuration

For **Cloud Run deployment**, update your `deploy-backend.sh`:

```bash
# Use Direct Connection (Session mode) - More reliable for EF Core
DATABASE_URL="Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"

# Deploy with environment variable
gcloud run deploy rental-management-api \
  --set-env-vars "DATABASE_URL=${DATABASE_URL}" \
  --region us-central1
```

### Debugging Steps

If you encounter connection issues:

1. **Verify connection string format:**
```bash
# Test connection locally
export DATABASE_URL="your-connection-string"
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet run
```

2. **Check Cloud Run logs:**
```bash
gcloud run services logs read rental-management-api --region us-central1 --limit 50
```

Look for:
- `Database connection configured. Host: db.xxx.supabase.co:5432` (should show correct host/port)
- Connection string length (should be > 0)
- Any "Format of the initialization string" errors

3. **Verify environment variables in Cloud Run:**
```bash
gcloud run services describe rental-management-api \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

4. **Test Supabase connection directly:**
```bash
psql "Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;sslmode=require"
```

### Best Practices

✅ **DO:**
- Use **Direct Connection (port 5432)** for EF Core migrations
- Use **Direct Connection (port 5432)** for Cloud Run runtime (more reliable)
- Store connection strings in environment variables
- Use static storage pattern in serverless environments
- Create a design-time DbContext factory
- Add detailed logging for connection string validation

❌ **DON'T:**
- Use Transaction Pooler (port 6543) for long-running operations like migrations
- Hardcode connection strings in source code
- Use PostgreSQL URI format directly with Npgsql (convert first)
- Assume connection strings persist through dependency injection in serverless

### When to Use Each Connection Type

| Connection Type | Port | Best For | Avoid For |
|----------------|------|----------|-----------|
| **Direct (Session)** | 5432 | Migrations, Cloud Run apps, long queries | Very high concurrency scenarios |
| **Transaction Pooler** | 6543 | Serverless functions, short API calls | Migrations, long-running queries |

---

## Migration Steps

### 1. Update NuGet Packages

**File**: `RentalManagement.Api/RentalManagement.Api.csproj`

#### Before (SQL Server):
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.0.7" />
```

#### After (PostgreSQL):
```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.2" />
```

**Complete Updated `.csproj` File**:
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="AutoMapper.Extensions.Microsoft.DependencyInjection" Version="12.0.1" />
    <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.1" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.7" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.0.7" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.4" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.7">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.2" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="9.0.7">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="QuestPDF" Version="2024.12.3" />
    <PackageReference Include="Serilog.AspNetCore" Version="9.0.0" />
    <PackageReference Include="Serilog.Sinks.File" Version="7.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="9.0.3" />
  </ItemGroup>

</Project>
```

**Restore packages**:
```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet restore
```

### 2. Update Connection Strings

**File**: `RentalManagement.Api/appsettings.json`

#### Before (SQL Server):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=RentalManagementDb;User Id=sa;Password=123456aA@;TrustServerCertificate=True"
  }
}
```

#### After (PostgreSQL):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=rental_management;Username=admin;Password=123456a@A;Include Error Detail=true"
  }
}
```

**PostgreSQL Connection String Format**:
```
Host={server};Port={port};Database={database};Username={user};Password={password};[options]
```

**Common Options**:
- `Include Error Detail=true` - Shows detailed error messages (development only)
- `SSL Mode=Require` - Enforces SSL connection (production)
- `Timeout=30` - Connection timeout in seconds
- `Command Timeout=30` - Command timeout in seconds
- `Pooling=true` - Enable connection pooling (default)
- `Minimum Pool Size=0` - Minimum connections in pool
- `Maximum Pool Size=100` - Maximum connections in pool

**Environment-Specific Configuration** (Recommended):

Create `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=rental_management;Username=admin;Password=123456a@A;Include Error Detail=true"
  }
}
```

Create `appsettings.Production.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD};SSL Mode=Require"
  }
}
```

### 3. Update DbContext Configuration

**File**: `RentalManagement.Api/Program.cs`

#### Before (SQL Server):
```csharp
builder.Services.AddDbContext<RentalManagementContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
```

#### After (PostgreSQL):
```csharp
builder.Services.AddDbContext<RentalManagementContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

**Complete Program.cs DbContext Section**:
```csharp
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// Add Entity Framework with PostgreSQL
builder.Services.AddDbContext<RentalManagementContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => 
        {
            // Enable retry on failure (recommended for production)
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
            
            // Set command timeout
            npgsqlOptions.CommandTimeout(60);
            
            // Use specific schema if needed
            // npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
        });
    
    // Enable sensitive data logging in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
```

### 4. Update Database Context Functions

**File**: `RentalManagement.Api/Data/RentalManagementContext.cs`

PostgreSQL uses different SQL functions than SQL Server. Update all default value specifications:

#### SQL Server Functions → PostgreSQL Functions

| SQL Server | PostgreSQL |
|------------|-----------|
| `GETUTCDATE()` | `NOW() AT TIME ZONE 'UTC'` |
| `GETDATE()` | `CURRENT_TIMESTAMP` |
| `NEWID()` | `gen_random_uuid()` |
| `SYSDATETIME()` | `NOW()` |

#### Before (SQL Server):
```csharp
entity.Property(r => r.CreatedAt)
      .HasDefaultValueSql("GETUTCDATE()");

entity.Property(r => r.UpdatedAt)
      .HasDefaultValueSql("GETUTCDATE()");
```

#### After (PostgreSQL):
```csharp
entity.Property(r => r.CreatedAt)
      .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

entity.Property(r => r.UpdatedAt)
      .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
```

#### Filter Syntax Changes

PostgreSQL uses double quotes for identifiers instead of square brackets:

**Before (SQL Server)**:
```csharp
.HasFilter("[IdentificationNumber] IS NOT NULL AND [IdentificationNumber] != ''");
```

**After (PostgreSQL)**:
```csharp
.HasFilter("\"IdentificationNumber\" IS NOT NULL AND \"IdentificationNumber\" != ''");
```

**Complete Example Configuration**:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Configure Tenant entity
    modelBuilder.Entity<Tenant>(entity =>
    {
        entity.HasIndex(t => t.Email)
              .IsUnique()
              .HasDatabaseName("IX_Tenants_Email");

        entity.HasIndex(t => t.IdentificationNumber)
              .IsUnique()
              .HasDatabaseName("IX_Tenants_IdentificationNumber")
              .HasFilter("\"IdentificationNumber\" IS NOT NULL AND \"IdentificationNumber\" != ''");

        entity.Property(t => t.SecurityDeposit)
              .HasPrecision(18, 2);

        entity.Property(t => t.MonthlyRent)
              .HasPrecision(18, 2);

        entity.Property(t => t.CreatedAt)
              .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

        entity.Property(t => t.UpdatedAt)
              .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

        // Configure relationship with Room
        entity.HasOne(t => t.Room)
              .WithMany(r => r.Tenants)
              .HasForeignKey(t => t.RoomId)
              .OnDelete(DeleteBehavior.SetNull);
    });
}
```

### 5. Update Database Management Service

**File**: `RentalManagement.Api/Services/Implementations/DatabaseManagementService.cs`

This service needs significant updates to work with PostgreSQL:

#### Update Using Statements

**Before**:
```csharp
using Microsoft.Data.SqlClient;
```

**After**:
```csharp
using Npgsql;
```

#### Update Connection String Builder

**Before**:
```csharp
var builder = new SqlConnectionStringBuilder(_connectionString);
var serverName = builder.DataSource;
var databaseName = builder.InitialCatalog;
```

**After**:
```csharp
var builder = new NpgsqlConnectionStringBuilder(_connectionString);
var serverName = builder.Host ?? "localhost";
var databaseName = builder.Database ?? "unknown";
```

#### Update Database Size Query

**Before (SQL Server)**:
```csharp
var sizeQuery = @"
    SELECT 
        SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8192.) / 1024 / 1024 AS SizeMB
    FROM sys.database_files 
    WHERE type = 0";
```

**After (PostgreSQL)**:
```csharp
var sizeQuery = @"
    SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 AS size_mb";
```

#### Update Table Count Query

**Before (SQL Server)**:
```csharp
var tableCountQuery = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
```

**After (PostgreSQL)**:
```csharp
var tableCountQuery = @"
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'";
```

#### Update Table Information Query

**Before (SQL Server)**:
```csharp
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
```

**After (PostgreSQL)**:
```csharp
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
```

#### Update Backup/Restore Operations

PostgreSQL uses `pg_dump` and `pg_restore` instead of T-SQL commands:

**Backup (PostgreSQL)**:
```csharp
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
```

**Restore (PostgreSQL)**:
```csharp
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
```

### 6. Setup PostgreSQL Container

**File**: `docker-compose.yml` (in project root)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: postgres_server
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: 123456a@A
      POSTGRES_DB: rental_management
    ports:
      - "5433:5432"  # External:Internal port mapping
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d rental_management"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

**Start PostgreSQL**:
```bash
# Start the container
docker-compose up -d

# Check container status
docker ps

# View logs
docker-compose logs -f postgres

# Stop the container
docker-compose down

# Stop and remove volumes (CAUTION: Deletes all data)
docker-compose down -v
```

### 7. Remove Old Migrations

If you have existing SQL Server migrations, remove them:

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api

# Remove Migrations folder
rm -rf Migrations/
```

### 8. Create New PostgreSQL Migrations

```bash
cd RentalManagementSystem/Backend/RentalManagement.Api

# Create initial migration
dotnet ef migrations add InitialPostgreSQLMigration

# Review the generated migration files in Migrations/ folder
```

**Generated Files**:
- `YYYYMMDDHHMMSS_InitialPostgreSQLMigration.cs` - Migration operations
- `YYYYMMDDHHMMSS_InitialPostgreSQLMigration.Designer.cs` - Migration metadata
- `RentalManagementContextModelSnapshot.cs` - Current model snapshot

### 9. Apply Migrations

```bash
# Apply migrations to create database schema
dotnet ef database update

# Verify migration status
dotnet ef migrations list
```

**Expected Output**:
```
Build started...
Build succeeded.
Done.
```

### 10. Build and Run Application

```bash
# Build the project
dotnet build

# Run the application
dotnet run
```

**Expected Console Output**:
```
[17:45:33 INF] Created role: Admin
[17:45:33 INF] Created role: Manager
[17:45:33 INF] Created role: Staff
[17:45:33 INF] Created admin user: admin@rentalmanagement.com
[17:45:33 INF] Database initialization completed successfully
[17:45:33 INF] Rental Management System API started
```

---

## Code Changes Required

### Summary of All Code Changes

1. **NuGet Package** (`RentalManagement.Api.csproj`)
   - Replace `Microsoft.EntityFrameworkCore.SqlServer` → `Npgsql.EntityFrameworkCore.PostgreSQL`

2. **Connection String** (`appsettings.json`)
   - Update format from SQL Server to PostgreSQL connection string

3. **DbContext Registration** (`Program.cs`)
   - Change `UseSqlServer()` → `UseNpgsql()`

4. **Default Values** (`RentalManagementContext.cs`)
   - Change `GETUTCDATE()` → `NOW() AT TIME ZONE 'UTC'`
   - Update filter syntax: `[Column]` → `"Column"`

5. **Database Management Service** (`DatabaseManagementService.cs`)
   - Replace `Microsoft.Data.SqlClient` → `Npgsql`
   - Update all SQL queries to PostgreSQL syntax
   - Replace backup/restore logic with `pg_dump`/`pg_restore`

6. **Docker Configuration** (`docker-compose.yml`)
   - Add PostgreSQL service configuration

### Files Modified

```
✓ RentalManagement.Api.csproj
✓ appsettings.json
✓ Program.cs
✓ Data/RentalManagementContext.cs
✓ Services/Implementations/DatabaseManagementService.cs
✓ docker-compose.yml (root)
```

---

## Database Differences

### Key Differences Between SQL Server and PostgreSQL

| Feature | SQL Server | PostgreSQL |
|---------|-----------|------------|
| **Case Sensitivity** | Not case-sensitive | Case-sensitive for identifiers |
| **String Concatenation** | `+` | `\|\|` |
| **Top N** | `SELECT TOP 10` | `SELECT ... LIMIT 10` |
| **Identity Column** | `IDENTITY(1,1)` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` |
| **Date/Time Functions** | `GETDATE()`, `GETUTCDATE()` | `NOW()`, `CURRENT_TIMESTAMP` |
| **String Comparison** | Case-insensitive by default | Case-sensitive (use `ILIKE` for case-insensitive) |
| **Boolean Type** | `BIT` (0/1) | `BOOLEAN` (true/false) |
| **Variable Declaration** | `DECLARE @var` | `DECLARE var` |
| **Schema Default** | `dbo` | `public` |
| **Quotes** | `[column]` or `"column"` | `"column"` |
| **Offset/Fetch** | `OFFSET ... FETCH` | `OFFSET ... LIMIT` |

### Data Type Mappings

| .NET Type | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| `int` | `INT` | `integer` |
| `long` | `BIGINT` | `bigint` |
| `string` | `NVARCHAR(MAX)` | `text` |
| `string(n)` | `NVARCHAR(n)` | `varchar(n)` |
| `decimal` | `DECIMAL(18,2)` | `numeric(18,2)` |
| `DateTime` | `DATETIME2` | `timestamp without time zone` |
| `DateTimeOffset` | `DATETIMEOFFSET` | `timestamp with time zone` |
| `bool` | `BIT` | `boolean` |
| `Guid` | `UNIQUEIDENTIFIER` | `uuid` |
| `byte[]` | `VARBINARY(MAX)` | `bytea` |

### PostgreSQL-Specific Features to Leverage

1. **Array Types**
   ```csharp
   public string[] Tags { get; set; }  // Stored as text[]
   ```

2. **JSON/JSONB Support**
   ```csharp
   [Column(TypeName = "jsonb")]
   public string Metadata { get; set; }
   ```

3. **Full-Text Search**
   ```sql
   CREATE INDEX idx_description_fts ON rooms USING gin(to_tsvector('english', description));
   ```

4. **Range Types**
   ```csharp
   [Column(TypeName = "daterange")]
   public NpgsqlRange<DateTime> RentalPeriod { get; set; }
   ```

---

## Testing the Migration

### 1. Verify Database Connection

```bash
# Using psql (PostgreSQL client)
psql -h localhost -p 5433 -U admin -d rental_management

# List all tables
\dt

# Describe a table
\d+ rooms

# View table data
SELECT * FROM rooms;

# Exit psql
\q
```

### 2. Test API Endpoints

```bash
# Health check (if implemented)
curl http://localhost:5000/health

# Get rooms
curl http://localhost:5000/api/rooms

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rentalmanagement.com",
    "password": "Admin123!"
  }'
```

### 3. Verify Swagger UI

Navigate to: `http://localhost:5000/swagger`

Test various endpoints through the Swagger UI interface.

### 4. Check Logs

```bash
# View application logs
tail -f RentalManagementSystem/Backend/RentalManagement.Api/logs/rental-management-*.txt

# View PostgreSQL logs
docker-compose logs -f postgres
```

### 5. Performance Testing

```bash
# Install Apache Bench (if not installed)
# macOS
brew install httpd

# Run performance test
ab -n 1000 -c 10 http://localhost:5000/api/rooms
```

### 6. Integration Tests

Create a test project to verify all operations:

```csharp
public class PostgreSqlIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public PostgreSqlIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetRooms_ReturnsSuccessStatusCode()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/rooms");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Failed: Connection Refused

**Error**:
```
Npgsql.NpgsqlException: Connection refused
```

**Solutions**:
- Verify PostgreSQL container is running: `docker ps`
- Check port mapping in docker-compose.yml
- Verify firewall settings
- Test connection: `telnet localhost 5433`

#### 2. Password Authentication Failed

**Error**:
```
Npgsql.PostgresException: password authentication failed for user "admin"
```

**Solutions**:
- Verify password in connection string matches docker-compose.yml
- Recreate container: `docker-compose down -v && docker-compose up -d`
- Check for special characters in password (may need escaping)

#### 3. Database Does Not Exist

**Error**:
```
Npgsql.PostgresException: database "rental_management" does not exist
```

**Solutions**:
```bash
# Create database manually
docker exec -it postgres_server psql -U admin -c "CREATE DATABASE rental_management;"

# OR recreate container
docker-compose down -v
docker-compose up -d
```

#### 4. Migration Failed

**Error**:
```
Build failed.
```

**Solutions**:
```bash
# Clean and rebuild
dotnet clean
dotnet build

# Remove obj and bin folders
rm -rf obj/ bin/

# Restore packages
dotnet restore

# Try migration again
dotnet ef database update
```

#### 5. SSL Connection Required

**Error**:
```
The server doesn't support SSL or SSL is not configured properly
```

**Solutions**:
- For development, add to connection string: `;SSL Mode=Disable`
- For production, configure SSL properly

#### 6. Table Already Exists

**Error**:
```
Npgsql.PostgresException: relation "rooms" already exists
```

**Solutions**:
```bash
# Drop and recreate database
dotnet ef database drop --force
dotnet ef database update
```

#### 7. Performance Issues

**Symptoms**:
- Slow query execution
- High CPU usage
- Connection timeouts

**Solutions**:
```sql
-- Enable query logging
ALTER DATABASE rental_management SET log_statement = 'all';

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM rooms WHERE status = 'Vacant';

-- Update statistics
ANALYZE rooms;

-- Rebuild indexes
REINDEX TABLE rooms;
```

#### 8. Connection Pool Exhausted

**Error**:
```
Npgsql.NpgsqlException: The connection pool has been exhausted
```

**Solutions**:
- Increase pool size in connection string: `;Maximum Pool Size=200`
- Ensure connections are properly disposed
- Use `using` statements for database operations
- Check for connection leaks

---

## PostgreSQL Best Practices

### 1. Connection Management

```csharp
// Always use dependency injection
public class RoomService
{
    private readonly RentalManagementContext _context;
    
    public RoomService(RentalManagementContext context)
    {
        _context = context;
    }
    
    // Context is automatically disposed by DI container
}
```

### 2. Query Optimization

```csharp
// Bad: Multiple database calls
var rooms = await _context.Rooms.ToListAsync();
foreach (var room in rooms)
{
    var tenants = await _context.Tenants.Where(t => t.RoomId == room.Id).ToListAsync();
    room.Tenants = tenants;
}

// Good: Single query with eager loading
var rooms = await _context.Rooms
    .Include(r => r.Tenants)
    .ToListAsync();
```

### 3. Use AsNoTracking for Read-Only Queries

```csharp
// For read-only operations
var rooms = await _context.Rooms
    .AsNoTracking()
    .ToListAsync();
```

### 4. Implement Pagination

```csharp
public async Task<PagedResult<Room>> GetRoomsAsync(int pageNumber, int pageSize)
{
    var query = _context.Rooms.AsQueryable();
    
    var totalCount = await query.CountAsync();
    
    var rooms = await query
        .OrderBy(r => r.RoomNumber)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
    
    return new PagedResult<Room>
    {
        Items = rooms,
        TotalCount = totalCount,
        PageNumber = pageNumber,
        PageSize = pageSize
    };
}
```

### 5. Use Transactions for Multiple Operations

```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    // Multiple operations
    var tenant = new Tenant { /* ... */ };
    await _context.Tenants.AddAsync(tenant);
    await _context.SaveChangesAsync();
    
    var invoice = new Invoice { TenantId = tenant.Id };
    await _context.Invoices.AddAsync(invoice);
    await _context.SaveChangesAsync();
    
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

### 6. Index Strategy

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Create indexes for frequently queried columns
    modelBuilder.Entity<Room>()
        .HasIndex(r => r.Status)
        .HasDatabaseName("IX_Rooms_Status");
    
    modelBuilder.Entity<Room>()
        .HasIndex(r => new { r.Status, r.Type })
        .HasDatabaseName("IX_Rooms_Status_Type");
}
```

### 7. Use Compiled Queries for Frequent Operations

```csharp
private static readonly Func<RentalManagementContext, int, Task<Room?>> GetRoomByIdQuery =
    EF.CompileAsyncQuery((RentalManagementContext context, int id) =>
        context.Rooms.FirstOrDefault(r => r.Id == id));

public async Task<Room?> GetRoomByIdAsync(int id)
{
    return await GetRoomByIdQuery(_context, id);
}
```

### 8. Connection String Security

```csharp
// Use Azure Key Vault or environment variables
builder.Configuration.AddAzureKeyVault(/* ... */);

// Or use User Secrets in development
// dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=..."
```

### 9. Logging Configuration

```csharp
builder.Services.AddDbContext<RentalManagementContext>(options =>
{
    options.UseNpgsql(connectionString);
    
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
        options.LogTo(Console.WriteLine, LogLevel.Information);
    }
});
```

### 10. Regular Maintenance

```sql
-- Schedule these operations during low-traffic periods

-- Vacuum (reclaim storage)
VACUUM ANALYZE;

-- Update statistics
ANALYZE;

-- Reindex
REINDEX DATABASE rental_management;
```

### 11. Monitoring Queries

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 12. Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="rental_management_${DATE}.backup"

# Create backup
pg_dump -h localhost -p 5433 -U admin -F c -f "${BACKUP_DIR}/${FILENAME}" rental_management

# Keep only last 7 days
find ${BACKUP_DIR} -name "rental_management_*.backup" -mtime +7 -delete

echo "Backup completed: ${FILENAME}"
```

---

## Rollback Strategy

### If Migration Fails

#### 1. Revert Code Changes

```bash
# If you committed changes
git revert HEAD

# If changes are uncommitted
git checkout -- .
git clean -fd
```

#### 2. Restore SQL Server Configuration

1. Update `RentalManagement.Api.csproj`:
   ```xml
   <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.0.7" />
   ```

2. Update `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost,1433;Database=RentalManagementDb;User Id=sa;Password=123456aA@;TrustServerCertificate=True"
     }
   }
   ```

3. Update `Program.cs`:
   ```csharp
   builder.Services.AddDbContext<RentalManagementContext>(options =>
       options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
   ```

4. Restore packages and rebuild:
   ```bash
   dotnet restore
   dotnet build
   ```

#### 3. Restore Data from Backup

If you backed up SQL Server data:

```bash
# Restore SQL Server backup
# Use SQL Server Management Studio or sqlcmd
```

---

## Additional Resources

### Official Documentation

- **PostgreSQL**: https://www.postgresql.org/docs/15/index.html
- **Npgsql**: https://www.npgsql.org/doc/index.html
- **EF Core**: https://learn.microsoft.com/en-us/ef/core/

### Useful Tools

- **pgAdmin**: GUI for PostgreSQL management
- **Azure Data Studio**: Cross-platform database tool
- **DBeaver**: Universal database tool
- **DataGrip**: JetBrains database IDE

### Performance Monitoring

- **pg_stat_statements**: Track query statistics
- **pgBadger**: Log analyzer
- **PgHero**: Performance dashboard

### Learning Resources

- PostgreSQL Tutorial: https://www.postgresqltutorial.com/
- Use The Index, Luke: https://use-the-index-luke.com/
- PostgreSQL Performance: https://www.postgresql.org/docs/current/performance-tips.html

---

## Conclusion

This migration guide provides a comprehensive approach to migrating from SQL Server to PostgreSQL. By following these steps carefully and understanding the differences between the two database systems, you can successfully migrate your Rental Management System to PostgreSQL.

### Key Takeaways

1. ✅ PostgreSQL is a robust, open-source alternative to SQL Server
2. ✅ Entity Framework Core makes database migration relatively straightforward
3. ✅ Most application code remains unchanged
4. ✅ Main changes are in connection strings, DbContext configuration, and SQL syntax
5. ✅ PostgreSQL offers excellent performance and advanced features
6. ✅ Proper testing and backup strategies are essential

### Next Steps

- Monitor application performance after migration
- Optimize queries based on PostgreSQL execution plans
- Implement regular backup and maintenance schedules
- Consider PostgreSQL-specific features for future enhancements
- Update documentation and runbooks for operations team

---

**Document Version**: 1.0  
**Last Updated**: January 7, 2026  
**Maintained By**: Development Team  
**Questions?**: Contact dev@rentalmanagement.com
