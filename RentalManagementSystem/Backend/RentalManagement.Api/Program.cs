using System;
using System.Text;

using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using RentalManagement.Api.Data;
using RentalManagement.Api.Mappings;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Implementations;
using RentalManagement.Api.Services.Interfaces;
using Serilog;

static string NormalizePostgresConnectionString(string input)
{
    input = input.Trim();

    // If it's already Npgsql style (Host=...;Port=...), return as-is
    if (input.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        return input;

    // If it's URL style: postgresql://user:pass@host:port/db
    if (input.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        input.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(input);
        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";

        var db = uri.AbsolutePath.Trim('/');

        var b = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = string.IsNullOrEmpty(db) ? "postgres" : db,
            Username = user,
            Password = pass,
            SslMode = SslMode.Require,
            MaxAutoPrepare = 0,
            AutoPrepareMinUsages = 0
        };

        return b.ConnectionString;
    }

    return input;
}

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/rental-management-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

var rawConn =
    Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Validate
if (string.IsNullOrWhiteSpace(rawConn))
{
    Log.Fatal("Database connection string is empty. Set DATABASE_URL or ConnectionStrings:DefaultConnection.");
    throw new InvalidOperationException("Database connection string not configured");
}

// Normalize if DATABASE_URL is in URL form (postgresql://...)
string connectionString = NormalizePostgresConnectionString(rawConn);

// Parse safely for logging (no password)
var csb = new NpgsqlConnectionStringBuilder(connectionString);
Log.Information("DB configured. Host={Host} Port={Port} Database={Db} Username={User}",
    csb.Host, csb.Port, csb.Database, csb.Username);

// Store in a static variable to ensure it's never lost
StaticConnectionString.Value = connectionString;

// Add Entity Framework with PostgreSQL using factory with connection resilience
builder.Services.AddDbContext<RentalManagementContext>((serviceProvider, options) =>
{
    var connStr = StaticConnectionString.Value;
    if (string.IsNullOrWhiteSpace(connStr))
    {
        throw new InvalidOperationException("Connection string is null or empty in DbContext factory");
    }

    options.UseNpgsql(connStr, npgsqlOptions =>
    {
        // Add connection resilience for serverless environments like Render
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);

        // Set command timeout for long-running operations
        npgsqlOptions.CommandTimeout(30);
    });

    // Add detailed logging for connection issues
    if (builder.Environment.IsProduction())
    {
        options.LogTo(message => Log.Information("EF Core: {Message}", message), LogLevel.Information);
    }
});

// Add Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 6;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<RentalManagementContext>()
.AddDefaultTokenProviders();

// Add JWT Authentication - support environment variable override
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? jwtSettings["SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey not configured");

Log.Information("JWT Configuration - Issuer: {Issuer}, Audience: {Audience}",
    jwtSettings["Issuer"], jwtSettings["Audience"]);

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false; // Set to true in production with HTTPS
    options.MapInboundClaims = false; // Preserve claim names as-is

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = signingKey,
        ClockSkew = TimeSpan.Zero,
        RequireSignedTokens = true
    };

    // Add event handlers to log authentication failures
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Log.Error("JWT Authentication failed: {Exception}", context.Exception.Message);
            if (context.Exception.InnerException != null)
            {
                Log.Error("Inner exception: {InnerException}", context.Exception.InnerException.Message);
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Log.Information("JWT Token validated successfully for user: {User}",
                context.Principal?.Identity?.Name ?? "Unknown");
            return Task.CompletedTask;
        },
        OnMessageReceived = context =>
        {
            var token = context.Token;
            if (!string.IsNullOrEmpty(token))
            {
                Log.Information("JWT Token received, length: {Length}", token.Length);
            }
            return Task.CompletedTask;
        },
        OnChallenge = context =>
        {
            Log.Warning("JWT Challenge triggered. Error: {Error}, ErrorDescription: {ErrorDescription}",
                context.Error, context.ErrorDescription);
            return Task.CompletedTask;
        }
    };
});

// Add Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("Manager", policy => policy.RequireRole("Admin", "Manager"));
    options.AddPolicy("Staff", policy => policy.RequireRole("Admin", "Manager", "Staff"));
});

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// Add FluentValidation
builder.Services.AddFluentValidationAutoValidation();

// Add CORS - support production origins
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = new List<string>
        {
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174"
        };

        // Add production frontend URLs from environment variable (comma-separated)
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            // Split by comma to support multiple frontend URLs
            var frontendUrls = frontendUrl.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(url => url.Trim())
                .Where(url => !string.IsNullOrEmpty(url));
            allowedOrigins.AddRange(frontendUrls);

            Log.Information("CORS configured for origins: {Origins}", string.Join(", ", allowedOrigins));
        }

        policy.WithOrigins(allowedOrigins.ToArray())
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IReportingService, ReportingService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IPdfService, PdfService>();
builder.Services.AddScoped<IDatabaseManagementService, DatabaseManagementService>();
builder.Services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();
builder.Services.AddScoped<ILocalizationService, LocalizationService>();
builder.Services.AddScoped<ISystemManagementService, SystemManagementService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// Add controllers
builder.Services.AddControllers();

// Add API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Rental Management System API",
        Version = "v1",
        Description = "A comprehensive rental room management system API",
        Contact = new OpenApiContact
        {
            Name = "Development Team",
            Email = "dev@rentalmanagement.com"
        }
    });

    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // Include XML comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Rental Management System API v1");
        c.RoutePrefix = "swagger";
    });
}
else
{
    // Enable Swagger in production for testing (optional - remove if not needed)
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Rental Management System API v1");
        c.RoutePrefix = "swagger";
    });

    // Only use HTTPS redirection in production
    app.UseHttpsRedirection();
}

// CORS must be placed before Authentication and Authorization
app.UseCors("AllowFrontend");

// Add request logging
app.UseSerilogRequestLogging();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Add health check endpoint for Render
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "1.0.0"
}));

// Initialize database and seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RentalManagementContext>();
        var userManager = services.GetRequiredService<UserManager<User>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        // Apply pending migrations
        await context.Database.MigrateAsync();

        // Seed roles
        await SeedRolesAsync(roleManager);

        // Seed admin user
        await SeedAdminUserAsync(userManager);

        Log.Information("Database initialization completed successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while initializing the database");
    }
}

Log.Information("Rental Management System API started");

app.Run();

/// <summary>
/// Seeds the default roles in the system
/// </summary>
static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
{
    string[] roles = { "Admin", "Manager", "Staff" };

    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
            Log.Information("Created role: {Role}", role);
        }
    }
}

/// <summary>
/// Seeds the default admin user
/// </summary>
static async Task SeedAdminUserAsync(UserManager<User> userManager)
{
    const string adminEmail = "admin@rentalmanagement.com";

    if (await userManager.FindByEmailAsync(adminEmail) is null)
    {
        var adminUser = new User
        {
            UserName = adminEmail,
            Email = adminEmail,
            FirstName = "System",
            LastName = "Administrator",
            EmailConfirmed = true,
            IsActive = true
        };

        var result = await userManager.CreateAsync(adminUser, "Admin123!");

        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(adminUser, "Admin");
            Log.Information("Created admin user: {Email}", adminEmail);
        }
        else
        {
            Log.Error("Failed to create admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}

/// <summary>
/// Static storage for connection string
/// </summary>
public static class StaticConnectionString
{
    public static string Value { get; set; } = string.Empty;
}