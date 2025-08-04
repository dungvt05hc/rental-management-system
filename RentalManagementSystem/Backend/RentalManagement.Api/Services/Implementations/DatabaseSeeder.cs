using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations
{
    public class DatabaseSeeder : IDatabaseSeeder
    {
        private readonly RentalManagementContext _context;
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(
            RentalManagementContext context,
            UserManager<User> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<DatabaseSeeder> logger)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            try
            {
                _logger.LogInformation("Starting database seeding process...");

                await SeedRolesAsync();
                await SeedUsersAsync();
                await SeedRoomsAsync();
                await SeedTenantsAsync();
                await SeedInvoicesAsync();
                await SeedPaymentsAsync();

                _logger.LogInformation("Database seeding completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during database seeding");
                throw;
            }
        }

        public async Task SeedRolesAsync()
        {
            try
            {
                var roles = new[] { "Admin", "Manager", "Staff" };

                foreach (var roleName in roles)
                {
                    if (!await _roleManager.RoleExistsAsync(roleName))
                    {
                        await _roleManager.CreateAsync(new IdentityRole(roleName));
                        _logger.LogInformation("Created role: {RoleName}", roleName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding roles");
                throw;
            }
        }

        public async Task SeedUsersAsync()
        {
            try
            {
                var users = new[]
                {
                    new { Email = "admin@rental.com", FirstName = "System", LastName = "Administrator", Role = "Admin", Password = "Admin123!" },
                    new { Email = "manager@rental.com", FirstName = "John", LastName = "Manager", Role = "Manager", Password = "Manager123!" },
                    new { Email = "staff1@rental.com", FirstName = "Alice", LastName = "Smith", Role = "Staff", Password = "Staff123!" },
                    new { Email = "staff2@rental.com", FirstName = "Bob", LastName = "Johnson", Role = "Staff", Password = "Staff123!" },
                    new { Email = "staff3@rental.com", FirstName = "Carol", LastName = "Williams", Role = "Staff", Password = "Staff123!" }
                };

                foreach (var userData in users)
                {
                    if (await _userManager.FindByEmailAsync(userData.Email) == null)
                    {
                        var user = new User
                        {
                            UserName = userData.Email,
                            Email = userData.Email,
                            FirstName = userData.FirstName,
                            LastName = userData.LastName,
                            EmailConfirmed = true,
                            IsActive = true
                        };

                        var result = await _userManager.CreateAsync(user, userData.Password);
                        if (result.Succeeded)
                        {
                            await _userManager.AddToRoleAsync(user, userData.Role);
                            _logger.LogInformation("Created user: {Email} with role: {Role}", userData.Email, userData.Role);
                        }
                        else
                        {
                            _logger.LogError("Failed to create user {Email}: {Errors}", 
                                userData.Email, string.Join(", ", result.Errors.Select(e => e.Description)));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding users");
                throw;
            }
        }

        public async Task SeedRoomsAsync()
        {
            try
            {
                if (!await _context.Rooms.AnyAsync())
                {
                    var rooms = new[]
                    {
                        new Room { RoomNumber = "A101", Type = RoomType.Studio, Area = 45, MonthlyRent = 800, Status = RoomStatus.Vacant, Description = "Cozy studio apartment with kitchenette", Floor = 1, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = false },
                        new Room { RoomNumber = "A102", Type = RoomType.Single, Area = 65, MonthlyRent = 1200, Status = RoomStatus.Rented, Description = "One bedroom with separate living area", Floor = 1, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "A103", Type = RoomType.Single, Area = 70, MonthlyRent = 1300, Status = RoomStatus.Vacant, Description = "Spacious one bedroom with balcony", Floor = 1, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = false },
                        new Room { RoomNumber = "B201", Type = RoomType.Double, Area = 85, MonthlyRent = 1600, Status = RoomStatus.Vacant, Description = "Two bedroom apartment with modern amenities", Floor = 2, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "B202", Type = RoomType.Double, Area = 90, MonthlyRent = 1700, Status = RoomStatus.Rented, Description = "Large two bedroom with city view", Floor = 2, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "B203", Type = RoomType.Studio, Area = 40, MonthlyRent = 750, Status = RoomStatus.Vacant, Description = "Compact studio perfect for students", Floor = 2, HasAirConditioning = false, HasPrivateBathroom = true, IsFurnished = false },
                        new Room { RoomNumber = "C301", Type = RoomType.Triple, Area = 120, MonthlyRent = 2200, Status = RoomStatus.Vacant, Description = "Three bedroom family apartment", Floor = 3, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "C302", Type = RoomType.Double, Area = 95, MonthlyRent = 1800, Status = RoomStatus.Vacant, Description = "Premium two bedroom with hardwood floors", Floor = 3, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "C303", Type = RoomType.Single, Area = 75, MonthlyRent = 1400, Status = RoomStatus.Rented, Description = "Luxury one bedroom with premium finishes", Floor = 3, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true },
                        new Room { RoomNumber = "D401", Type = RoomType.Apartment, Area = 130, MonthlyRent = 2400, Status = RoomStatus.Vacant, Description = "Penthouse three bedroom with terrace", Floor = 4, HasAirConditioning = true, HasPrivateBathroom = true, IsFurnished = true }
                    };

                    await _context.Rooms.AddRangeAsync(rooms);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Seeded {Count} rooms", rooms.Length);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding rooms");
                throw;
            }
        }

        public async Task SeedTenantsAsync()
        {
            try
            {
                if (!await _context.Tenants.AnyAsync())
                {
                    var occupiedRooms = await _context.Rooms.Where(r => r.Status == RoomStatus.Rented).ToListAsync();
                    
                    var tenants = new[]
                    {
                        new Tenant 
                        { 
                            FirstName = "Michael", 
                            LastName = "Davis", 
                            Email = "michael.davis@email.com", 
                            PhoneNumber = "+1-555-0123", 
                            DateOfBirth = new DateTime(1990, 5, 15),
                            EmergencyContactName = "Sarah Davis",
                            EmergencyContactPhone = "+1-555-0124",
                            ContractStartDate = DateTime.Now.AddMonths(-6),
                            ContractEndDate = DateTime.Now.AddMonths(6),
                            IsActive = true,
                            RoomId = occupiedRooms.ElementAtOrDefault(0)?.Id ?? 0,
                            MonthlyRent = 1200,
                            SecurityDeposit = 2400
                        },
                        new Tenant 
                        { 
                            FirstName = "Emma", 
                            LastName = "Wilson", 
                            Email = "emma.wilson@email.com", 
                            PhoneNumber = "+1-555-0125", 
                            DateOfBirth = new DateTime(1988, 8, 22),
                            EmergencyContactName = "James Wilson",
                            EmergencyContactPhone = "+1-555-0126",
                            ContractStartDate = DateTime.Now.AddMonths(-4),
                            ContractEndDate = DateTime.Now.AddMonths(8),
                            IsActive = true,
                            RoomId = occupiedRooms.ElementAtOrDefault(1)?.Id ?? 0,
                            MonthlyRent = 1700,
                            SecurityDeposit = 3400
                        },
                        new Tenant 
                        { 
                            FirstName = "David", 
                            LastName = "Brown", 
                            Email = "david.brown@email.com", 
                            PhoneNumber = "+1-555-0127", 
                            DateOfBirth = new DateTime(1985, 12, 3),
                            EmergencyContactName = "Lisa Brown",
                            EmergencyContactPhone = "+1-555-0128",
                            ContractStartDate = DateTime.Now.AddMonths(-8),
                            ContractEndDate = DateTime.Now.AddMonths(4),
                            IsActive = true,
                            RoomId = occupiedRooms.ElementAtOrDefault(2)?.Id ?? 0,
                            MonthlyRent = 1400,
                            SecurityDeposit = 2800
                        },
                        new Tenant 
                        { 
                            FirstName = "Sophie", 
                            LastName = "Anderson", 
                            Email = "sophie.anderson@email.com", 
                            PhoneNumber = "+1-555-0129", 
                            DateOfBirth = new DateTime(1992, 3, 18),
                            EmergencyContactName = "Mark Anderson",
                            EmergencyContactPhone = "+1-555-0130",
                            ContractStartDate = DateTime.Now.AddMonths(-2),
                            ContractEndDate = DateTime.Now.AddMonths(10),
                            IsActive = true,
                            RoomId = 0, // Will be assigned to available room later
                            MonthlyRent = 1000,
                            SecurityDeposit = 2000
                        },
                        new Tenant 
                        { 
                            FirstName = "James", 
                            LastName = "Miller", 
                            Email = "james.miller@email.com", 
                            PhoneNumber = "+1-555-0131", 
                            DateOfBirth = new DateTime(1987, 7, 9),
                            EmergencyContactName = "Anna Miller",
                            EmergencyContactPhone = "+1-555-0132",
                            ContractStartDate = DateTime.Now.AddMonths(-10),
                            ContractEndDate = DateTime.Now.AddMonths(2),
                            IsActive = false, // Past tenant
                            RoomId = 0,
                            MonthlyRent = 1000,
                            SecurityDeposit = 2000
                        }
                    };

                    await _context.Tenants.AddRangeAsync(tenants);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Seeded {Count} tenants", tenants.Length);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding tenants");
                throw;
            }
        }

        public async Task SeedInvoicesAsync()
        {
            try
            {
                if (!await _context.Invoices.AnyAsync())
                {
                    var tenants = await _context.Tenants.Include(t => t.Room).Where(t => t.IsActive).ToListAsync();
                    var invoices = new List<Invoice>();
                    var random = new Random();

                foreach (var tenant in tenants)
                {
                    // Create invoices for the last 6 months
                    for (int i = 0; i < 6; i++)
                    {
                        var invoiceDate = DateTime.Now.AddMonths(-i).Date;
                        var dueDate = invoiceDate.AddDays(15);
                        var monthlyRent = tenant.Room?.MonthlyRent ?? tenant.MonthlyRent;
                        
                        var invoice = new Invoice
                        {
                            TenantId = tenant.Id,
                            RoomId = tenant.RoomId ?? 0,
                            InvoiceNumber = $"INV-{DateTime.Now.Year}-{tenant.Id:D3}-{(6-i):D2}",
                            IssueDate = invoiceDate,
                            DueDate = dueDate,
                            BillingPeriod = invoiceDate,
                            MonthlyRent = monthlyRent,
                            AdditionalCharges = 0,
                            Discount = 0,
                            TotalAmount = monthlyRent,
                            PaidAmount = i >= 2 ? monthlyRent : 0, // Paid if older than 2 months
                            RemainingBalance = i >= 2 ? 0 : monthlyRent,
                            Status = i == 0 ? InvoiceStatus.Unpaid : (i == 1 ? InvoiceStatus.Overdue : InvoiceStatus.Paid),
                            Notes = $"Monthly rent for {invoiceDate:MMMM yyyy}",
                            CreatedAt = invoiceDate,
                            UpdatedAt = invoiceDate,
                            PaidDate = i >= 2 ? dueDate.AddDays(-random.Next(1, 10)) : null
                        };

                        invoices.Add(invoice);
                    }
                }                    await _context.Invoices.AddRangeAsync(invoices);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Seeded {Count} invoices", invoices.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding invoices");
                throw;
            }
        }

        public async Task SeedPaymentsAsync()
        {
            try
            {
                if (!await _context.Payments.AnyAsync())
                {
                    var paidInvoices = await _context.Invoices.Where(i => i.Status == InvoiceStatus.Paid).ToListAsync();
                    var payments = new List<Payment>();
                    var paymentMethods = new[] { PaymentMethod.CreditCard, PaymentMethod.BankTransfer, PaymentMethod.Cash, PaymentMethod.Check };
                    var random = new Random();

                    foreach (var invoice in paidInvoices)
                    {
                        var payment = new Payment
                        {
                            InvoiceId = invoice.Id,
                            Amount = invoice.TotalAmount,
                            PaymentDate = invoice.DueDate.AddDays(-random.Next(1, 10)), // Paid within due date
                            Method = paymentMethods[random.Next(paymentMethods.Length)],
                            ReferenceNumber = $"TXN-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                            Notes = "Payment received on time",
                            CreatedAt = invoice.DueDate.AddDays(-random.Next(1, 10)),
                            UpdatedAt = invoice.DueDate.AddDays(-random.Next(1, 10))
                        };

                        payments.Add(payment);
                    }

                    await _context.Payments.AddRangeAsync(payments);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Seeded {Count} payments", payments.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding payments");
                throw;
            }
        }
    }
}
