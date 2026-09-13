using System;
using System.Text;
using System.Threading.RateLimiting;

using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using RentalManagement.Api.Data;
using RentalManagement.Api.Mappings;
using RentalManagement.Api.Middleware;
using RentalManagement.Api.Models.Email;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Security;
using RentalManagement.Api.Services.Implementations;
using RentalManagement.Api.Services.Interfaces;
using Serilog;
using RentalManagement.Api.Infrastructure;

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

// Add Entity Framework with PostgreSQL using factory with connection resilience
builder.Services.AddDbContext<RentalManagementContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        // Add connection resilience for serverless environments like Render
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);

        // Set command timeout for long-running operations
        npgsqlOptions.CommandTimeout(30);
    });
});

// Add Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 10;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = true;

    // Token xác nhận email dùng provider riêng, chỉ để nó có thời hạn khác với
    // token đặt lại mật khẩu (xem EmailConfirmationTokenProviderOptions).
    options.Tokens.EmailConfirmationTokenProvider = EmailConfirmationTokenProviderOptions.ProviderName;
})
.AddEntityFrameworkStores<RentalManagementContext>()
.AddDefaultTokenProviders()
.AddTokenProvider<EmailConfirmationTokenProvider<User>>(
    EmailConfirmationTokenProviderOptions.ProviderName);

// Thời hạn token sinh bởi DataProtectorTokenProvider — trong đó có token đặt
// lại mật khẩu. Mặc định của Identity là 1 ngày, quá dài cho một link nằm sẵn
// trong hộp thư: ai đọc được email cũ trong ngày là đổi được mật khẩu.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(1);
});

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
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
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
        OnTokenValidated = async context =>
        {
            // Chữ ký hợp lệ mới là điều kiện cần. Bước này đối chiếu security
            // stamp với database để token phát hành trước lần đổi mật khẩu gần
            // nhất không còn dùng được.
            await JwtSecurityStampValidator.ValidateAsync(context);

            if (context.Result?.Succeeded == false)
            {
                Log.Warning("JWT rejected after signature check: {Reason}",
                    context.Result.Failure?.Message);
                return;
            }

            Log.Debug("JWT Token validated successfully for user: {User}",
                context.Principal?.Identity?.Name ?? "Unknown");
        },
        OnMessageReceived = context =>
        {
            var token = context.Token;
            if (!string.IsNullOrEmpty(token))
            {
                Log.Debug("JWT Token received, length: {Length}", token.Length);
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

// Chạy sau reverse proxy (Render), nên IP thật nằm trong X-Forwarded-For.
// Không có bước này thì RemoteIpAddress luôn là IP của proxy và rate limiter
// bên dưới sẽ gộp toàn bộ người dùng vào chung một partition.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // IP của proxy do nền tảng cấp phát động nên không liệt kê trước được.
    // ForwardLimit mặc định là 1, tức là chỉ lấy entry cuối cùng của
    // X-Forwarded-For — entry do chính proxy ghi thêm — nên client không thể
    // giả mạo IP bằng cách tự gửi header này.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Rate limiting cho đăng nhập.
// Identity lockout chỉ khoá theo tài khoản (5 lần sai / 30 phút) nên không
// chặn được brute force phân tán: dò một mật khẩu phổ biến trên hàng loạt
// tài khoản khác nhau không bao giờ chạm ngưỡng lockout của tài khoản nào.
// Giới hạn theo IP bịt đúng lỗ đó.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(RateLimitPolicies.Login, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                // 10 lần thử/phút: thoải mái cho người gõ nhầm, nhưng cắt
                // brute force tự động xuống mức vô dụng.
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Quên mật khẩu tốn kém hơn đăng nhập — mỗi lần gọi là một email gửi đi —
    // nên hạn mức chặt hơn nhiều. Đây là lớp chặn theo IP; số email tối đa tới
    // cùng một địa chỉ do IEmailRateLimiter lo, vì email nằm trong body mà hàm
    // phân vùng ở đây chạy trước khi body được đọc.
    options.AddPolicy(RateLimitPolicies.ForgotPassword, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    // Tự đăng ký là endpoint ẩn danh DUY NHẤT tạo ra dữ liệu: mỗi lần gọi thành
    // công là một tài khoản mới và một email gửi đi. 5 lần/giờ đủ cho người gõ
    // nhầm vài lần, và cắt hẳn khả năng dựng hàng loạt tài khoản từ một máy.
    options.AddPolicy(RateLimitPolicies.Register, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));

    // check-email trả lời đúng câu hỏi "địa chỉ này có tài khoản không", nên nó
    // là kênh user enumeration. Form đăng ký chỉ gọi nó mỗi lần rời ô email, tức
    // vài lần cho một lần điền form; 30 lần/5 phút thoải mái cho việc đó nhưng
    // vô dụng với ai muốn quét cả danh sách địa chỉ.
    options.AddPolicy(RateLimitPolicies.CheckEmail, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    // Gửi lại link xác nhận cũng là một email mỗi lần gọi, nên chặt như quên
    // mật khẩu. Số email tối đa tới cùng một địa chỉ vẫn do IEmailRateLimiter lo.
    options.AddPolicy(RateLimitPolicies.ResendConfirmation, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    options.OnRejected = (context, _) =>
    {
        Log.Warning("Rate limit exceeded for {Path} from {RemoteIp}",
            context.HttpContext.Request.Path,
            context.HttpContext.Connection.RemoteIpAddress);
        return ValueTask.CompletedTask;
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
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IRentalContractService, RentalContractService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IReportingService, ReportingService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IPdfService, PdfService>();
builder.Services.AddScoped<ILocalizationService, LocalizationService>();
builder.Services.AddScoped<ISystemManagementService, SystemManagementService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();

// Email infrastructure.
// Cấu hình đọc từ biến môi trường, không có gì trong appsettings, để mật khẩu
// SMTP không bao giờ nằm trong repo.
var emailSettings = EmailSettings.FromEnvironment();
builder.Services.AddSingleton(Options.Create(emailSettings));

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IEmailRateLimiter, MemoryCacheEmailRateLimiter>();
builder.Services.AddSingleton<IEmailTemplateRenderer, EmailTemplateRenderer>();
builder.Services.AddScoped<IEmailLanguageResolver, UserEmailLanguageResolver>();

if (emailSettings.IsConfigured)
{
    // Hàng đợi và tiến trình nền là singleton; chỉ tiến trình nền chờ SMTP nên
    // request trả về ngay sau khi email được xếp hàng.
    builder.Services.AddSingleton<IEmailQueue, EmailQueue>();
    builder.Services.AddSingleton<IEmailSender, MailKitEmailSender>();
    builder.Services.AddHostedService<EmailQueueProcessor>();

    builder.Services.AddScoped<SmtpEmailService>();
    builder.Services.AddScoped<IEmailService>(sp => new RateLimitedEmailService(
        sp.GetRequiredService<SmtpEmailService>(),
        sp.GetRequiredService<IEmailRateLimiter>()));

    Log.Information("Email configured. Host={Host} Port={Port} From={From}",
        emailSettings.Host, emailSettings.Port, emailSettings.FromEmail);
}
else
{
    // Thiếu SMTP_HOST thì chỉ ghi log thay vì ném lỗi, để máy dev chạy được
    // toàn bộ ứng dụng mà không cần máy chủ SMTP thật.
    builder.Services.AddScoped<NoOpEmailService>();
    builder.Services.AddScoped<IEmailService>(sp => new RateLimitedEmailService(
        sp.GetRequiredService<NoOpEmailService>(),
        sp.GetRequiredService<IEmailRateLimiter>()));

    Log.Warning("SMTP_HOST is not set. Emails will be logged instead of sent.");
}

// Add controllers
builder.Services.AddControllers(options =>
{
    // Chèn vào ĐẦU danh sách để giành quyền bind DateTime trước binder mặc định.
    // Không có nó, ngày gửi lên dạng "2026-09-01" mang Kind=Unspecified và
    // Npgsql từ chối ghi vào cột timestamptz — xem Infrastructure/UtcDateTimeModelBinder.cs.
    options.ModelBinderProviders.Insert(0, new UtcDateTimeModelBinderProvider());
});

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

// Must be first: catches exceptions thrown anywhere further down the pipeline,
// including CORS, authentication and authorization.
app.UseMiddleware<ExceptionHandlerMiddleware>();

// Phải đứng trước mọi thứ đọc IP hoặc scheme của request (rate limiter,
// request logging, HTTPS redirection).
app.UseForwardedHeaders();

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
    // Only use HTTPS redirection in production
    app.UseHttpsRedirection();
}

// CORS must be placed before Authentication and Authorization
app.UseCors("AllowFrontend");

// Add request logging
app.UseSerilogRequestLogging();

app.UseRateLimiter();

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

        // Seed bảng dịch từ locales/*.json đã nhúng trong assembly.
        // Trước đây việc này chỉ chạy khi admin bấm nút, nên một môi trường mới
        // lên là không có chữ nào trong DB. Seed theo kiểu chỉ-thêm-khoá-mới,
        // an toàn để chạy ở mỗi lần khởi động.
        var localizationService = services.GetRequiredService<ILocalizationService>();
        await localizationService.SeedDefaultTranslationsAsync();

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

        var seedPassword = Environment.GetEnvironmentVariable("SEED_ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(seedPassword))
        {
            Log.Warning("SEED_ADMIN_PASSWORD is not set. Skipping admin user creation.");
            return;
        }

        var result = await userManager.CreateAsync(adminUser, seedPassword);

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