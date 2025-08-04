using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RentalManagementSystem.Data;
using RentalManagementSystem.Models;

namespace RentalManagementSystem.Services
{
    public class DatabaseSeeder
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
                // Ensure database is created
                await _context.Database.EnsureCreatedAsync();
                
                // Apply any pending migrations
                if ((await _context.Database.GetPendingMigrationsAsync()).Any())
                {
                    await _context.Database.MigrateAsync();
                }

                // Seed roles first
                await SeedRolesAsync();

                // Seed users
                await SeedUsersAsync();

                // Seed rooms
                await SeedRoomsAsync();

                // Seed tenants
                await SeedTenantsAsync();

                // Seed invoices
                await SeedInvoicesAsync();

                // Seed payments
                await SeedPaymentsAsync();

                _logger.LogInformation("Database seeding completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while seeding the database.");
                throw;
            }
        }

        private async Task SeedRolesAsync()
        {
            var roles = new[] { "Admin", "Manager", "Staff" };

            foreach (var roleName in roles)
            {
                if (!await _roleManager.RoleExistsAsync(roleName))
                {
                    var role = new IdentityRole(roleName);
                    await _roleManager.CreateAsync(role);
                    _logger.LogInformation($"Created role: {roleName}");
                }
            }
        }

        private async Task SeedUsersAsync()
        {
            var users = new[]
            {
                new { Email = "admin@rentalms.com", UserName = "admin", FirstName = "System", LastName = "Administrator", Role = "Admin", Password = "Admin123!" },
                new { Email = "manager@rentalms.com", UserName = "manager", FirstName = "John", LastName = "Manager", Role = "Manager", Password = "Manager123!" },
                new { Email = "staff@rentalms.com", UserName = "staff", FirstName = "Jane", LastName = "Staff", Role = "Staff", Password = "Staff123!" },
                new { Email = "john.doe@email.com", UserName = "johndoe", FirstName = "John", LastName = "Doe", Role = "Staff", Password = "Staff123!" },
                new { Email = "jane.smith@email.com", UserName = "janesmith", FirstName = "Jane", LastName = "Smith", Role = "Manager", Password = "Manager123!" }
            };

            foreach (var userData in users)
            {
                var existingUser = await _userManager.FindByEmailAsync(userData.Email);
                if (existingUser == null)
                {
                    var user = new User
                    {
                        UserName = userData.UserName,
                        Email = userData.Email,
                        FirstName = userData.FirstName,
                        LastName = userData.LastName,
                        EmailConfirmed = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    var result = await _userManager.CreateAsync(user, userData.Password);
                    if (result.Succeeded)
                    {
                        await _userManager.AddToRoleAsync(user, userData.Role);
                        _logger.LogInformation($"Created user: {userData.Email} with role: {userData.Role}");
                    }
                    else
                    {
                        _logger.LogError($"Failed to create user {userData.Email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                    }
                }
            }
        }

        private async Task SeedRoomsAsync()
        {
            if (!await _context.Rooms.AnyAsync())
            {
                var rooms = new[]
                {
                    new Room { RoomNumber = "101", Description = "Single bedroom apartment with kitchen", MonthlyRent = 800, Status = RoomStatus.Available },
                    new Room { RoomNumber = "102", Description = "Single bedroom apartment with balcony", MonthlyRent = 850, Status = RoomStatus.Available },
                    new Room { RoomNumber = "103", Description = "Studio apartment with modern amenities", MonthlyRent = 700, Status = RoomStatus.Available },
                    new Room { RoomNumber = "201", Description = "Two bedroom apartment with parking", MonthlyRent = 1200, Status = RoomStatus.Available },
                    new Room { RoomNumber = "202", Description = "Two bedroom apartment with garden view", MonthlyRent = 1250, Status = RoomStatus.Available },
                    new Room { RoomNumber = "203", Description = "Deluxe two bedroom with premium fixtures", MonthlyRent = 1400, Status = RoomStatus.Available },
                    new Room { RoomNumber = "301", Description = "Penthouse with city view", MonthlyRent = 2000, Status = RoomStatus.Available },
                    new Room { RoomNumber = "302", Description = "Luxury apartment with terrace", MonthlyRent = 1800, Status = RoomStatus.Available },
                    new Room { RoomNumber = "B01", Description = "Basement studio - budget friendly", MonthlyRent = 500, Status = RoomStatus.Maintenance },
                    new Room { RoomNumber = "B02", Description = "Basement one bedroom", MonthlyRent = 600, Status = RoomStatus.Available }
                };

                foreach (var room in rooms)
                {
                    room.CreatedAt = DateTime.UtcNow;
                    room.UpdatedAt = DateTime.UtcNow;
                }

                await _context.Rooms.AddRangeAsync(rooms);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Seeded {rooms.Length} rooms");
            }
        }

        private async Task SeedTenantsAsync()
        {
            if (!await _context.Tenants.AnyAsync())
            {
                var availableRooms = await _context.Rooms
                    .Where(r => r.Status == RoomStatus.Available)
                    .Take(5)
                    .ToListAsync();

                var tenants = new[]
                {
                    new Tenant
                    {
                        FirstName = "Alice",
                        LastName = "Johnson",
                        Email = "alice.johnson@email.com",
                        PhoneNumber = "+1-555-0101",
                        IdentityNumber = "ID123456789",
                        Address = "123 Main St, City, State 12345",
                        EmergencyContact = "Bob Johnson",
                        EmergencyPhone = "+1-555-0102",
                        SecurityDeposit = 1600,
                        Status = TenantStatus.Active,
                        CheckInDate = DateTime.UtcNow.AddMonths(-6),
                        RoomId = availableRooms.Count > 0 ? availableRooms[0].Id : null
                    },
                    new Tenant
                    {
                        FirstName = "Michael",
                        LastName = "Brown",
                        Email = "michael.brown@email.com",
                        PhoneNumber = "+1-555-0201",
                        IdentityNumber = "ID987654321",
                        Address = "456 Oak Ave, City, State 12345",
                        EmergencyContact = "Sarah Brown",
                        EmergencyPhone = "+1-555-0202",
                        SecurityDeposit = 1700,
                        Status = TenantStatus.Active,
                        CheckInDate = DateTime.UtcNow.AddMonths(-4),
                        RoomId = availableRooms.Count > 1 ? availableRooms[1].Id : null
                    },
                    new Tenant
                    {
                        FirstName = "Emily",
                        LastName = "Davis",
                        Email = "emily.davis@email.com",
                        PhoneNumber = "+1-555-0301",
                        IdentityNumber = "ID456789123",
                        Address = "789 Pine St, City, State 12345",
                        EmergencyContact = "David Davis",
                        EmergencyPhone = "+1-555-0302",
                        SecurityDeposit = 1400,
                        Status = TenantStatus.Active,
                        CheckInDate = DateTime.UtcNow.AddMonths(-2),
                        RoomId = availableRooms.Count > 2 ? availableRooms[2].Id : null
                    },
                    new Tenant
                    {
                        FirstName = "Robert",
                        LastName = "Wilson",
                        Email = "robert.wilson@email.com",
                        PhoneNumber = "+1-555-0401",
                        IdentityNumber = "ID789123456",
                        Address = "321 Elm St, City, State 12345",
                        EmergencyContact = "Lisa Wilson",
                        EmergencyPhone = "+1-555-0402",
                        SecurityDeposit = 2400,
                        Status = TenantStatus.Active,
                        CheckInDate = DateTime.UtcNow.AddMonths(-8),
                        RoomId = availableRooms.Count > 3 ? availableRooms[3].Id : null
                    },
                    new Tenant
                    {
                        FirstName = "Maria",
                        LastName = "Garcia",
                        Email = "maria.garcia@email.com",
                        PhoneNumber = "+1-555-0501",
                        IdentityNumber = "ID321654987",
                        Address = "654 Maple Dr, City, State 12345",
                        EmergencyContact = "Carlos Garcia",
                        EmergencyPhone = "+1-555-0502",
                        SecurityDeposit = 1200,
                        Status = TenantStatus.Inactive,
                        CheckInDate = DateTime.UtcNow.AddMonths(-12),
                        CheckOutDate = DateTime.UtcNow.AddMonths(-1)
                    }
                };

                foreach (var tenant in tenants)
                {
                    tenant.CreatedAt = DateTime.UtcNow;
                    tenant.UpdatedAt = DateTime.UtcNow;
                }

                await _context.Tenants.AddRangeAsync(tenants);
                await _context.SaveChangesAsync();

                // Update room status for occupied rooms
                var occupiedRooms = tenants.Where(t => t.RoomId.HasValue && t.Status == TenantStatus.Active)
                    .Select(t => t.RoomId.Value).ToList();

                var roomsToUpdate = await _context.Rooms.Where(r => occupiedRooms.Contains(r.Id)).ToListAsync();
                foreach (var room in roomsToUpdate)
                {
                    room.Status = RoomStatus.Occupied;
                    room.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"Seeded {tenants.Length} tenants and updated room statuses");
            }
        }

        private async Task SeedInvoicesAsync()
        {
            if (!await _context.Invoices.AnyAsync())
            {
                var activeTenants = await _context.Tenants
                    .Include(t => t.Room)
                    .Where(t => t.Status == TenantStatus.Active && t.RoomId.HasValue)
                    .ToListAsync();

                var invoices = new List<Invoice>();
                var invoiceCounter = 1;

                foreach (var tenant in activeTenants)
                {
                    // Create invoices for the last 6 months
                    for (int monthsBack = 5; monthsBack >= 0; monthsBack--)
                    {
                        var invoiceDate = DateTime.UtcNow.AddMonths(-monthsBack);
                        var dueDate = new DateTime(invoiceDate.Year, invoiceDate.Month, 1).AddMonths(1).AddDays(4); // Due on 5th of next month

                        var status = monthsBack == 0 ? InvoiceStatus.Pending :
                                   monthsBack == 1 && Random.Shared.Next(0, 3) == 0 ? InvoiceStatus.Overdue :
                                   InvoiceStatus.Paid;

                        invoices.Add(new Invoice
                        {
                            TenantId = tenant.Id,
                            RoomId = tenant.RoomId!.Value,
                            InvoiceNumber = $"INV-{DateTime.UtcNow.Year:D4}-{invoiceCounter:D4}",
                            Amount = tenant.Room!.MonthlyRent,
                            IssuedDate = invoiceDate,
                            DueDate = dueDate,
                            Status = status,
                            Description = $"Monthly rent for {tenant.Room.RoomNumber} - {invoiceDate:MMMM yyyy}",
                            CreatedAt = invoiceDate,
                            UpdatedAt = invoiceDate
                        });

                        invoiceCounter++;
                    }
                }

                await _context.Invoices.AddRangeAsync(invoices);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Seeded {invoices.Count} invoices");
            }
        }

        private async Task SeedPaymentsAsync()
        {
            if (!await _context.Payments.AnyAsync())
            {
                var paidInvoices = await _context.Invoices
                    .Where(i => i.Status == InvoiceStatus.Paid)
                    .ToListAsync();

                var payments = new List<Payment>();
                var paymentMethods = new[] { PaymentMethod.BankTransfer, PaymentMethod.Cash, PaymentMethod.Check, PaymentMethod.CreditCard };

                foreach (var invoice in paidInvoices)
                {
                    var paymentDate = invoice.DueDate.AddDays(Random.Shared.Next(-5, 3)); // Payment within a few days of due date
                    var method = paymentMethods[Random.Shared.Next(paymentMethods.Length)];

                    payments.Add(new Payment
                    {
                        InvoiceId = invoice.Id,
                        Amount = invoice.Amount,
                        PaymentDate = paymentDate,
                        PaymentMethod = method,
                        Reference = method == PaymentMethod.BankTransfer ? $"TXN{Random.Shared.Next(100000, 999999)}" :
                                  method == PaymentMethod.Check ? $"CHK{Random.Shared.Next(1000, 9999)}" :
                                  method == PaymentMethod.CreditCard ? $"CC****{Random.Shared.Next(1000, 9999)}" : null,
                        Notes = $"Payment for invoice {invoice.InvoiceNumber}",
                        CreatedAt = paymentDate,
                        UpdatedAt = paymentDate
                    });
                }

                await _context.Payments.AddRangeAsync(payments);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Seeded {payments.Count} payments");
            }
        }
    }
}
