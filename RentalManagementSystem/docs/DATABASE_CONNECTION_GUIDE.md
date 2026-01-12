# Database Connection Configuration Guide

## Overview

This guide explains how to properly configure database connection strings for both local development and production environments in the Rental Management System.

## The Problem

The error `Format of the initialization string does not conform to specification starting at index 0` occurs when:
1. The connection string is empty or null
2. The connection string format is incorrect for Npgsql (PostgreSQL provider)
3. There's a mismatch between URI format and key-value format

## Connection String Formats

### ✅ Correct Format (Npgsql Key-Value)

```
Host=localhost;Port=5432;Database=rental_management;Username=postgres;Password=postgres;Include Error Detail=true
```

### ❌ Incorrect Format (PostgreSQL URI)

```
postgresql://username:password@host:port/database
```

**Note:** Npgsql does NOT support the URI format. You must use key-value pairs separated by semicolons.

## Environment Configuration

### 1. Local Development (appsettings.Development.json)

Use this for local PostgreSQL running on your machine:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=rental_management;Username=postgres;Password=postgres;Include Error Detail=true"
  }
}
```

**Setup Local PostgreSQL:**

```bash
# Using Docker
docker run --name postgres-rental \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rental_management \
  -p 5432:5432 \
  -d postgres:16

# Or using Homebrew (macOS)
brew install postgresql@16
brew services start postgresql@16
createdb rental_management
```

### 2. Production (appsettings.Production.json)

Use this for Supabase or other cloud PostgreSQL:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.fpvgtejnkxkushmzkstu;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true;Pooling=true;Minimum Pool Size=0;Maximum Pool Size=100"
  }
}
```

### 3. Environment Variables (Recommended for Production)

Instead of hardcoding in `appsettings.Production.json`, use environment variables:

```bash
# Set environment variable
export DATABASE_URL="Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.fpvgtejnkxkushmzkstu;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true;Pooling=true"

# Or in .env file
DATABASE_URL="Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;..."
```

The application is already configured to read from `DATABASE_URL` environment variable in `Program.cs`:

```csharp
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");
```

## Connection String Parameters

### Essential Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `Host` | Database server hostname | `localhost` or `db.supabase.co` |
| `Port` | PostgreSQL port | `5432` (default) or `6543` (pooler) |
| `Database` | Database name | `rental_management` |
| `Username` | Database user | `postgres` |
| `Password` | User password | `your_secure_password` |

### Optional Parameters

| Parameter | Description | When to Use |
|-----------|-------------|-------------|
| `SSL Mode` | SSL connection mode | Use `Require` for cloud databases |
| `Trust Server Certificate` | Skip certificate validation | Set to `true` for Supabase |
| `Include Error Detail` | Show detailed errors | Use `true` in development only |
| `Pooling` | Enable connection pooling | Set to `true` for production |
| `Minimum Pool Size` | Min connections in pool | `0` for cloud services |
| `Maximum Pool Size` | Max connections in pool | `100` for high traffic |
| `Timeout` | Connection timeout in seconds | `30` (default) |
| `Command Timeout` | Command execution timeout | `30` (default) |

## Configuration by Environment

### Local Development Setup

1. **Install PostgreSQL** (if not using Docker):
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-16
   sudo systemctl start postgresql
   ```

2. **Create Database**:
   ```bash
   createdb rental_management
   ```

3. **Update appsettings.Development.json**:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=rental_management;Username=postgres;Password=postgres;Include Error Detail=true"
     }
   }
   ```

4. **Run Migrations**:
   ```bash
   cd RentalManagementSystem/Backend/RentalManagement.Api
   dotnet ef database update
   ```

### Production Setup (Supabase)

1. **Get Connection Details** from Supabase Dashboard:
   - Go to Settings → Database
   - Copy the connection pooler details (port 6543 for pooler, not 5432)

2. **Convert URI to Npgsql Format**:
   
   If Supabase gives you:
   ```
   postgresql://postgres.fpvgtejnkxkushmzkstu:qijfiw-qetqof-paJmo4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   
   Convert to:
   ```
   Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.fpvgtejnkxkushmzkstu;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true;Pooling=true
   ```

3. **Set Environment Variable** (recommended):
   ```bash
   # For deployment platforms
   DATABASE_URL="Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.fpvgtejnkxkushmzkstu;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true;Pooling=true;Minimum Pool Size=0;Maximum Pool Size=100"
   
   JWT_SECRET_KEY="your-production-secret-key-at-least-32-characters"
   ASPNETCORE_ENVIRONMENT="Production"
   ```

### Docker Setup

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: rental-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rental_management
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./RentalManagementSystem/Backend/RentalManagement.Api
    container_name: rental-api
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - DATABASE_URL=Host=postgres;Port=5432;Database=rental_management;Username=postgres;Password=postgres
      - JWT_SECRET_KEY=Development-Secret-Key-For-Docker
    ports:
      - "5000:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Troubleshooting

### Issue 1: "Format of the initialization string does not conform"

**Cause**: Invalid connection string format

**Solution**:
1. Check for URI format (`postgresql://...`) - convert to key-value format
2. Ensure no empty/null connection strings
3. Validate environment variables are set correctly

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test connection string format
dotnet run --project RentalManagementSystem/Backend/RentalManagement.Api
```

### Issue 2: "Connection refused" or "Timeout expired"

**Cause**: Can't reach database server

**Solution**:
1. Check PostgreSQL is running:
   ```bash
   # Local
   pg_isready
   
   # Docker
   docker ps | grep postgres
   ```

2. Verify firewall/security groups allow connection
3. Test connection manually:
   ```bash
   psql -h localhost -p 5432 -U postgres -d rental_management
   ```

### Issue 3: "Password authentication failed"

**Cause**: Wrong username or password

**Solution**:
1. Verify credentials in connection string
2. For Supabase, use the pooler credentials (include the project reference in username)
3. Check password for special characters that need escaping

### Issue 4: "SSL connection required"

**Cause**: Cloud database requires SSL but not configured

**Solution**:
Add SSL parameters to connection string:
```
SSL Mode=Require;Trust Server Certificate=true
```

### Issue 5: Connection pool exhausted

**Cause**: Too many concurrent connections

**Solution**:
Add pooling parameters:
```
Pooling=true;Minimum Pool Size=0;Maximum Pool Size=100;Connection Idle Lifetime=60
```

## Best Practices

### 1. Never Commit Secrets
- Add sensitive files to `.gitignore`:
  ```gitignore
  appsettings.*.json
  *.env
  .env.local
  ```
- Use environment variables for production
- Use Azure Key Vault or similar for cloud deployments

### 2. Different Credentials per Environment
- Development: Simple credentials (`postgres`/`postgres`)
- Production: Strong, unique passwords
- Consider using managed identities when possible

### 3. Connection Pooling
- Always enable pooling in production
- Set appropriate pool sizes based on expected load
- Monitor connection pool metrics

### 4. SSL/TLS in Production
- Always use `SSL Mode=Require` for cloud databases
- Use proper certificates when available
- Never use `Trust Server Certificate=true` with custom databases

### 5. Logging Configuration
Development:
```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

Production:
```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  }
}
```

## Testing Connection

### 1. Test Connection String Programmatically

```csharp
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=rental_management;Username=postgres;Password=postgres";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    Console.WriteLine("✅ Connection successful!");
    
    using var cmd = new NpgsqlCommand("SELECT version()", connection);
    var version = await cmd.ExecuteScalarAsync();
    Console.WriteLine($"PostgreSQL version: {version}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Connection failed: {ex.Message}");
}
```

### 2. Test with EF Core Migrations

```bash
# Check connection and pending migrations
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet ef database update --verbose

# Create test migration
dotnet ef migrations add TestConnection
dotnet ef database update
```

### 3. Test with psql

```bash
# Using connection string components
psql -h localhost -p 5432 -U postgres -d rental_management

# For Supabase
psql "postgresql://postgres.fpvgtejnkxkushmzkstu:qijfiw-qetqof-paJmo4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

## Quick Reference

### Local Development
```bash
# Set environment
export ASPNETCORE_ENVIRONMENT=Development

# Connection string
Host=localhost;Port=5432;Database=rental_management;Username=postgres;Password=postgres;Include Error Detail=true
```

### Production (Supabase Pooler)
```bash
# Set environment
export ASPNETCORE_ENVIRONMENT=Production
export DATABASE_URL="Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.PROJECT_REF;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;Pooling=true;Minimum Pool Size=0;Maximum Pool Size=100"
```

### Production (Direct Connection)
```bash
# For background jobs or migrations
Host=db.PROJECT_REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

## Resources

- [Npgsql Documentation](https://www.npgsql.org/doc/connection-string-parameters.html)
- [EF Core PostgreSQL Provider](https://www.npgsql.org/efcore/)
- [Supabase Connection Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/libpq-ssl.html)

## Support

If you continue to experience connection issues:
1. Check application logs: `logs/rental-management-*.txt`
2. Enable verbose logging in `appsettings.json`
3. Test connection with `psql` or database client
4. Verify database server is accessible from your network
