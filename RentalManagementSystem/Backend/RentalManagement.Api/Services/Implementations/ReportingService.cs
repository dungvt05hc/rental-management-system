using System.Text;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of reporting services
/// </summary>
public class ReportingService : IReportingService
{
    private readonly RentalManagementContext _context;
    private readonly ILogger<ReportingService> _logger;

    public ReportingService(
        RentalManagementContext context,
        ILogger<ReportingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> GetOccupancyRateReportAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var startDate = fromDate ?? now.AddMonths(-12);
            var endDate = toDate ?? now;

            var totalRooms = await _context.Rooms.CountAsync();
            
            // Get occupancy data by month
            var occupancyData = await _context.Tenants
                .Where(t => t.IsActive && t.RoomId.HasValue)
                .Where(t => t.ContractStartDate <= endDate && 
                           (t.ContractEndDate == null || t.ContractEndDate >= startDate))
                .GroupBy(t => new { 
                    Year = t.ContractStartDate!.Value.Year, 
                    Month = t.ContractStartDate!.Value.Month 
                })
                .Select(g => new {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    OccupiedRooms = g.Count()
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            var currentOccupancy = await _context.Tenants
                .CountAsync(t => t.IsActive && t.RoomId.HasValue);

            var report = new
            {
                ReportPeriod = new { FromDate = startDate, ToDate = endDate },
                TotalRooms = totalRooms,
                CurrentOccupancy = currentOccupancy,
                CurrentOccupancyRate = totalRooms > 0 ? Math.Round((double)currentOccupancy / totalRooms * 100, 2) : 0,
                MonthlyOccupancy = occupancyData.Select(x => new {
                    Period = $"{x.Year}-{x.Month:D2}",
                    OccupiedRooms = x.OccupiedRooms,
                    OccupancyRate = totalRooms > 0 ? Math.Round((double)x.OccupiedRooms / totalRooms * 100, 2) : 0
                }).ToList(),
                AverageOccupancyRate = occupancyData.Count > 0 && totalRooms > 0 
                    ? Math.Round(occupancyData.Average(x => (double)x.OccupiedRooms / totalRooms * 100), 2) 
                    : 0
            };

            _logger.LogInformation("Generated occupancy rate report from {FromDate} to {ToDate}", startDate, endDate);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating occupancy rate report");
            return ApiResponse<object>.ErrorResponse("Error generating occupancy rate report");
        }
    }

    public async Task<ApiResponse<object>> GetMonthlyRevenueReportAsync(int year)
    {
        try
        {
            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year, 12, 31, 23, 59, 59);

            // Get paid invoices for the year
            var monthlyRevenue = await _context.Invoices
                .Where(i => i.IssueDate >= startDate && i.IssueDate <= endDate && i.Status == InvoiceStatus.Paid)
                .GroupBy(i => i.IssueDate.Month)
                .Select(g => new {
                    Month = g.Key,
                    Revenue = g.Sum(i => i.TotalAmount),
                    InvoiceCount = g.Count()
                })
                .OrderBy(x => x.Month)
                .ToListAsync();

            // Get monthly payments for verification
            var monthlyPayments = await _context.Payments
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.IsVerified)
                .GroupBy(p => p.PaymentDate.Month)
                .Select(g => new {
                    Month = g.Key,
                    PaymentAmount = g.Sum(p => p.Amount),
                    PaymentCount = g.Count()
                })
                .OrderBy(x => x.Month)
                .ToListAsync();

            // Create complete monthly data (including months with zero revenue)
            var completeMonthlyData = Enumerable.Range(1, 12)
                .Select(month => {
                    var revenue = monthlyRevenue.FirstOrDefault(r => r.Month == month);
                    var payments = monthlyPayments.FirstOrDefault(p => p.Month == month);
                    
                    return new {
                        Month = month,
                        MonthName = new DateTime(year, month, 1).ToString("MMMM"),
                        Revenue = revenue?.Revenue ?? 0,
                        InvoiceCount = revenue?.InvoiceCount ?? 0,
                        PaymentAmount = payments?.PaymentAmount ?? 0,
                        PaymentCount = payments?.PaymentCount ?? 0
                    };
                })
                .ToList();

            var totalRevenue = completeMonthlyData.Sum(x => x.Revenue);
            var averageMonthlyRevenue = Math.Round((double)totalRevenue / 12, 2);

            var report = new
            {
                Year = year,
                TotalRevenue = totalRevenue,
                AverageMonthlyRevenue = averageMonthlyRevenue,
                TotalInvoices = completeMonthlyData.Sum(x => x.InvoiceCount),
                TotalPayments = completeMonthlyData.Sum(x => x.PaymentCount),
                MonthlyBreakdown = completeMonthlyData,
                HighestRevenueMonth = completeMonthlyData.OrderByDescending(x => x.Revenue).FirstOrDefault(),
                LowestRevenueMonth = completeMonthlyData.OrderBy(x => x.Revenue).FirstOrDefault()
            };

            _logger.LogInformation("Generated monthly revenue report for year {Year}", year);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating monthly revenue report for year {Year}", year);
            return ApiResponse<object>.ErrorResponse("Error generating monthly revenue report");
        }
    }

    public async Task<ApiResponse<object>> GetOutstandingPaymentsReportAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            
            // Get overdue invoices
            var overdueInvoices = await _context.Invoices
                .Include(i => i.Tenant)
                .Where(i => i.Status != InvoiceStatus.Paid && i.DueDate < now)
                .Select(i => new {
                    InvoiceId = i.Id,
                    TenantName = $"{i.Tenant.FirstName} {i.Tenant.LastName}",
                    Amount = i.TotalAmount,
                    DueDate = i.DueDate,
                    DaysOverdue = (int)(now - i.DueDate).TotalDays,
                    Status = i.Status.ToString()
                })
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            // Get upcoming invoices (due in next 30 days)
            var upcomingInvoices = await _context.Invoices
                .Include(i => i.Tenant)
                .Where(i => i.Status != InvoiceStatus.Paid && 
                           i.DueDate >= now && 
                           i.DueDate <= now.AddDays(30))
                .Select(i => new {
                    InvoiceId = i.Id,
                    TenantName = $"{i.Tenant.FirstName} {i.Tenant.LastName}",
                    Amount = i.TotalAmount,
                    DueDate = i.DueDate,
                    DaysUntilDue = (int)(i.DueDate - now).TotalDays,
                    Status = i.Status.ToString()
                })
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            // Summary statistics
            var totalOverdueAmount = overdueInvoices.Sum(i => i.Amount);
            var totalUpcomingAmount = upcomingInvoices.Sum(i => i.Amount);
            var totalOutstandingAmount = await _context.Invoices
                .Where(i => i.Status != InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            var report = new
            {
                GeneratedAt = now,
                Summary = new {
                    TotalOutstandingAmount = totalOutstandingAmount,
                    TotalOverdueAmount = totalOverdueAmount,
                    TotalUpcomingAmount = totalUpcomingAmount,
                    OverdueCount = overdueInvoices.Count,
                    UpcomingCount = upcomingInvoices.Count
                },
                OverdueInvoices = overdueInvoices,
                UpcomingInvoices = upcomingInvoices,
                AgeAnalysis = new {
                    Overdue0to30Days = overdueInvoices.Count(i => i.DaysOverdue <= 30),
                    Overdue31to60Days = overdueInvoices.Count(i => i.DaysOverdue > 30 && i.DaysOverdue <= 60),
                    Overdue61to90Days = overdueInvoices.Count(i => i.DaysOverdue > 60 && i.DaysOverdue <= 90),
                    OverdueOver90Days = overdueInvoices.Count(i => i.DaysOverdue > 90)
                }
            };

            _logger.LogInformation("Generated outstanding payments report - {OverdueCount} overdue, {UpcomingCount} upcoming", 
                overdueInvoices.Count, upcomingInvoices.Count);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating outstanding payments report");
            return ApiResponse<object>.ErrorResponse("Error generating outstanding payments report");
        }
    }

    public async Task<ApiResponse<object>> GetFinancialSummaryAsync(DateTime fromDate, DateTime toDate)
    {
        try
        {
            // Income data
            var totalRevenue = await _context.Invoices
                .Where(i => i.IssueDate >= fromDate && i.IssueDate <= toDate && i.Status == InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            var totalPayments = await _context.Payments
                .Where(p => p.PaymentDate >= fromDate && p.PaymentDate <= toDate && p.IsVerified)
                .SumAsync(p => p.Amount);

            // Outstanding amounts
            var totalOutstanding = await _context.Invoices
                .Where(i => i.IssueDate >= fromDate && i.IssueDate <= toDate && i.Status != InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            // Security deposits
            var totalSecurityDeposits = await _context.Tenants
                .Where(t => t.IsActive && t.ContractStartDate >= fromDate && t.ContractStartDate <= toDate)
                .SumAsync(t => t.SecurityDeposit);

            // Monthly breakdown
            var monthlyData = await _context.Invoices
                .Where(i => i.IssueDate >= fromDate && i.IssueDate <= toDate)
                .GroupBy(i => new { i.IssueDate.Year, i.IssueDate.Month })
                .Select(g => new {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalInvoiced = g.Sum(i => i.TotalAmount),
                    PaidAmount = g.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.TotalAmount),
                    OutstandingAmount = g.Where(i => i.Status != InvoiceStatus.Paid).Sum(i => i.TotalAmount),
                    InvoiceCount = g.Count()
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            var report = new
            {
                ReportPeriod = new { FromDate = fromDate, ToDate = toDate },
                Revenue = new {
                    TotalRevenue = totalRevenue,
                    TotalPayments = totalPayments,
                    TotalOutstanding = totalOutstanding,
                    CollectionRate = totalRevenue + totalOutstanding > 0 
                        ? Math.Round(totalRevenue / (totalRevenue + totalOutstanding) * 100, 2) 
                        : 0
                },
                Deposits = new {
                    TotalSecurityDeposits = totalSecurityDeposits
                },
                MonthlyBreakdown = monthlyData.Select(m => new {
                    Period = $"{m.Year}-{m.Month:D2}",
                    Year = m.Year,
                    Month = m.Month,
                    TotalInvoiced = m.TotalInvoiced,
                    PaidAmount = m.PaidAmount,
                    OutstandingAmount = m.OutstandingAmount,
                    InvoiceCount = m.InvoiceCount,
                    CollectionRate = m.TotalInvoiced > 0 
                        ? Math.Round(m.PaidAmount / m.TotalInvoiced * 100, 2) 
                        : 0
                }).ToList(),
                Summary = new {
                    AverageMonthlyRevenue = monthlyData.Count > 0 ? Math.Round(monthlyData.Average(m => m.PaidAmount), 2) : 0,
                    TotalInvoices = monthlyData.Sum(m => m.InvoiceCount),
                    NetIncome = totalRevenue - 0 // No expenses tracking yet
                }
            };

            _logger.LogInformation("Generated financial summary from {FromDate} to {ToDate}", fromDate, toDate);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating financial summary from {FromDate} to {ToDate}", fromDate, toDate);
            return ApiResponse<object>.ErrorResponse("Error generating financial summary");
        }
    }

    public async Task<ApiResponse<object>> GetTenantStatisticsAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);
            var ninetyDaysAgo = now.AddDays(-90);

            var totalTenants = await _context.Tenants.CountAsync();
            var activeTenants = await _context.Tenants.CountAsync(t => t.IsActive);
            var inactiveTenants = totalTenants - activeTenants;
            
            var assignedTenants = await _context.Tenants.CountAsync(t => t.IsActive && t.RoomId.HasValue);
            var unassignedTenants = activeTenants - assignedTenants;

            // Contract expiration analysis
            var contractsExpiringIn30Days = await _context.Tenants
                .CountAsync(t => t.IsActive && t.ContractEndDate.HasValue && 
                               t.ContractEndDate.Value <= now.AddDays(30) && t.ContractEndDate.Value >= now);

            var contractsExpiringIn90Days = await _context.Tenants
                .CountAsync(t => t.IsActive && t.ContractEndDate.HasValue && 
                               t.ContractEndDate.Value <= now.AddDays(90) && t.ContractEndDate.Value >= now);

            // Recent activity
            var newTenantsLast30Days = await _context.Tenants
                .CountAsync(t => t.CreatedAt >= thirtyDaysAgo);

            // Age demographics
            var tenantAgeGroups = await _context.Tenants
                .Where(t => t.IsActive && t.DateOfBirth.HasValue)
                .Select(t => t.DateOfBirth!.Value)
                .ToListAsync();

            var ageAnalysis = tenantAgeGroups
                .Select(dob => (int)((now - dob).TotalDays / 365.25))
                .GroupBy(age => age switch {
                    < 25 => "Under 25",
                    >= 25 and < 35 => "25-34",
                    >= 35 and < 45 => "35-44",
                    >= 45 and < 55 => "45-54",
                    >= 55 and < 65 => "55-64",
                    _ => "65+"
                })
                .ToDictionary(g => g.Key, g => g.Count());

            // Financial statistics
            var financialStats = await _context.Tenants
                .Where(t => t.IsActive)
                .GroupBy(t => 1)
                .Select(g => new {
                    TotalMonthlyRent = g.Sum(t => t.MonthlyRent),
                    AverageMonthlyRent = g.Average(t => t.MonthlyRent),
                    TotalSecurityDeposits = g.Sum(t => t.SecurityDeposit),
                    AverageSecurityDeposit = g.Average(t => t.SecurityDeposit)
                })
                .FirstOrDefaultAsync();

            var report = new
            {
                GeneratedAt = now,
                Overview = new {
                    TotalTenants = totalTenants,
                    ActiveTenants = activeTenants,
                    InactiveTenants = inactiveTenants,
                    AssignedTenants = assignedTenants,
                    UnassignedTenants = unassignedTenants
                },
                ContractStatus = new {
                    ExpiringIn30Days = contractsExpiringIn30Days,
                    ExpiringIn90Days = contractsExpiringIn90Days
                },
                RecentActivity = new {
                    NewTenantsLast30Days = newTenantsLast30Days
                },
                Demographics = new {
                    AgeGroups = ageAnalysis,
                    TotalWithAgeData = tenantAgeGroups.Count
                },
                FinancialSummary = new {
                    TotalMonthlyRent = financialStats?.TotalMonthlyRent ?? 0,
                    AverageMonthlyRent = Math.Round(financialStats?.AverageMonthlyRent ?? 0, 2),
                    TotalSecurityDeposits = financialStats?.TotalSecurityDeposits ?? 0,
                    AverageSecurityDeposit = Math.Round(financialStats?.AverageSecurityDeposit ?? 0, 2)
                },
                Ratios = new {
                    OccupancyRate = activeTenants > 0 ? Math.Round((double)assignedTenants / activeTenants * 100, 2) : 0,
                    ActivityRate = totalTenants > 0 ? Math.Round((double)activeTenants / totalTenants * 100, 2) : 0
                }
            };

            _logger.LogInformation("Generated tenant statistics report - {ActiveTenants} active out of {TotalTenants} total tenants", 
                activeTenants, totalTenants);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating tenant statistics");
            return ApiResponse<object>.ErrorResponse("Error generating tenant statistics");
        }
    }

    public async Task<ApiResponse<object>> GetRoomUtilizationReportAsync()
    {
        try
        {
            var totalRooms = await _context.Rooms.CountAsync();
            
            // Room status distribution
            var roomStatusDistribution = await _context.Rooms
                .GroupBy(r => r.Status)
                .Select(g => new {
                    Status = g.Key.ToString(),
                    Count = g.Count(),
                    Percentage = totalRooms > 0 ? Math.Round((double)g.Count() / totalRooms * 100, 2) : 0
                })
                .ToListAsync();

            // Detailed room information
            var roomDetails = await _context.Rooms
                .Include(r => r.Tenants.Where(t => t.IsActive))
                .Select(r => new {
                    RoomId = r.Id,
                    RoomNumber = r.RoomNumber,
                    Floor = r.Floor,
                    Status = r.Status.ToString(),
                    MonthlyRent = r.MonthlyRent,
                    CurrentTenant = r.Tenants.Where(t => t.IsActive).Select(t => new {
                        Id = t.Id,
                        Name = $"{t.FirstName} {t.LastName}",
                        ContractStart = t.ContractStartDate,
                        ContractEnd = t.ContractEndDate,
                        MonthlyRent = t.MonthlyRent
                    }).FirstOrDefault(),
                    IsOccupied = r.Tenants.Any(t => t.IsActive)
                })
                .OrderBy(r => r.RoomNumber)
                .ToListAsync();

            // Revenue by room type analysis
            var revenueByFloor = await _context.Rooms
                .Include(r => r.Tenants.Where(t => t.IsActive))
                .GroupBy(r => r.Floor)
                .Select(g => new {
                    Floor = g.Key,
                    TotalRooms = g.Count(),
                    OccupiedRooms = g.Count(r => r.Tenants.Any(t => t.IsActive)),
                    TotalRevenue = g.SelectMany(r => r.Tenants.Where(t => t.IsActive)).Sum(t => t.MonthlyRent),
                    AverageRent = g.SelectMany(r => r.Tenants.Where(t => t.IsActive)).Any() 
                        ? g.SelectMany(r => r.Tenants.Where(t => t.IsActive)).Average(t => t.MonthlyRent) 
                        : 0
                })
                .OrderBy(f => f.Floor)
                .ToListAsync();

            // Vacancy analysis
            var vacantRooms = roomDetails.Where(r => !r.IsOccupied).ToList();
            var occupiedRooms = roomDetails.Where(r => r.IsOccupied).ToList();

            var report = new
            {
                GeneratedAt = DateTime.UtcNow,
                Summary = new {
                    TotalRooms = totalRooms,
                    OccupiedRooms = occupiedRooms.Count,
                    VacantRooms = vacantRooms.Count,
                    OccupancyRate = totalRooms > 0 ? Math.Round((double)occupiedRooms.Count / totalRooms * 100, 2) : 0
                },
                StatusDistribution = roomStatusDistribution,
                FloorAnalysis = revenueByFloor.Select(f => new {
                    Floor = f.Floor,
                    TotalRooms = f.TotalRooms,
                    OccupiedRooms = f.OccupiedRooms,
                    VacantRooms = f.TotalRooms - f.OccupiedRooms,
                    OccupancyRate = f.TotalRooms > 0 ? Math.Round((double)f.OccupiedRooms / f.TotalRooms * 100, 2) : 0,
                    TotalRevenue = f.TotalRevenue,
                    AverageRent = Math.Round(f.AverageRent, 2)
                }).ToList(),
                RoomDetails = roomDetails,
                Revenue = new {
                    TotalMonthlyRevenue = occupiedRooms.Sum(r => r.CurrentTenant?.MonthlyRent ?? 0),
                    AverageRentPerRoom = occupiedRooms.Count > 0 
                        ? Math.Round(occupiedRooms.Average(r => r.CurrentTenant?.MonthlyRent ?? 0), 2) 
                        : 0,
                    PotentialRevenue = roomDetails.Sum(r => r.MonthlyRent),
                    RevenueEfficiency = roomDetails.Sum(r => r.MonthlyRent) > 0 
                        ? Math.Round(occupiedRooms.Sum(r => r.CurrentTenant?.MonthlyRent ?? 0) / roomDetails.Sum(r => r.MonthlyRent) * 100, 2) 
                        : 0
                }
            };

            _logger.LogInformation("Generated room utilization report - {OccupiedRooms}/{TotalRooms} rooms occupied ({OccupancyRate}%)", 
                occupiedRooms.Count, totalRooms, report.Summary.OccupancyRate);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating room utilization report");
            return ApiResponse<object>.ErrorResponse("Error generating room utilization report");
        }
    }

    public async Task<ApiResponse<object>> GetPaymentMethodDistributionAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var startDate = fromDate ?? now.AddMonths(-12);
            var endDate = toDate ?? now;

            // Get payment method distribution
            var paymentDistribution = await _context.Payments
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate && p.IsVerified)
                .GroupBy(p => p.Method)
                .Select(g => new {
                    PaymentMethod = g.Key.ToString(),
                    Count = g.Count(),
                    TotalAmount = g.Sum(p => p.Amount),
                    AverageAmount = g.Average(p => p.Amount)
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToListAsync();

            var totalPayments = paymentDistribution.Sum(p => p.Count);
            var totalAmount = paymentDistribution.Sum(p => p.TotalAmount);

            var report = new
            {
                ReportPeriod = new { FromDate = startDate, ToDate = endDate },
                Summary = new {
                    TotalPayments = totalPayments,
                    TotalAmount = totalAmount,
                    AveragePayment = totalPayments > 0 ? Math.Round(totalAmount / totalPayments, 2) : 0
                },
                Distribution = paymentDistribution.Select(p => new {
                    PaymentMethod = p.PaymentMethod,
                    Count = p.Count,
                    TotalAmount = p.TotalAmount,
                    AverageAmount = Math.Round(p.AverageAmount, 2),
                    Percentage = totalAmount > 0 ? Math.Round(p.TotalAmount / totalAmount * 100, 2) : 0
                }).ToList()
            };

            _logger.LogInformation("Generated payment method distribution report from {FromDate} to {ToDate}", startDate, endDate);
            return ApiResponse<object>.SuccessResponse(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating payment method distribution report");
            return ApiResponse<object>.ErrorResponse("Error generating payment method distribution report");
        }
    }

    public async Task<ApiResponse<object>> GetDashboardSummaryAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var currentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var lastMonth = currentMonth.AddMonths(-1);
            var next30Days = now.AddDays(30);

            // Room statistics
            var totalRooms = await _context.Rooms.CountAsync();
            var occupiedRooms = await _context.Tenants.CountAsync(t => t.IsActive && t.RoomId.HasValue);
            var occupancyRate = totalRooms > 0 ? Math.Round((double)occupiedRooms / totalRooms * 100, 2) : 0;

            // Tenant statistics
            var totalTenants = await _context.Tenants.CountAsync(t => t.IsActive);
            var newTenantsThisMonth = await _context.Tenants
                .CountAsync(t => t.CreatedAt >= currentMonth);

            // Financial overview
            var monthlyRevenue = await _context.Invoices
                .Where(i => i.IssueDate >= currentMonth && i.Status == InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            var lastMonthRevenue = await _context.Invoices
                .Where(i => i.IssueDate >= lastMonth && i.IssueDate < currentMonth && i.Status == InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            var pendingPayments = await _context.Invoices
                .Where(i => i.Status != InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            var overdueInvoices = await _context.Invoices
                .CountAsync(i => i.Status != InvoiceStatus.Paid && i.DueDate < now);

            // Upcoming events
            var contractsExpiringInNext30Days = await _context.Tenants
                .Where(t => t.IsActive && t.ContractEndDate.HasValue && 
                           t.ContractEndDate.Value <= next30Days && t.ContractEndDate.Value >= now)
                .Select(t => new {
                    TenantName = $"{t.FirstName} {t.LastName}",
                    RoomNumber = t.Room != null ? t.Room.RoomNumber : "N/A",
                    ExpiryDate = t.ContractEndDate
                })
                .OrderBy(x => x.ExpiryDate)
                .ToListAsync();

            // Calculate growth rate
            var revenueGrowthRate = lastMonthRevenue > 0 
                ? Math.Round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100, 2) 
                : 0;

            var summary = new
            {
                GeneratedAt = now,
                Occupancy = new {
                    TotalRooms = totalRooms,
                    OccupiedRooms = occupiedRooms,
                    VacantRooms = totalRooms - occupiedRooms,
                    OccupancyRate = occupancyRate
                },
                Tenants = new {
                    TotalActive = totalTenants,
                    NewThisMonth = newTenantsThisMonth
                },
                Financials = new {
                    MonthlyRevenue = monthlyRevenue,
                    LastMonthRevenue = lastMonthRevenue,
                    RevenueGrowthRate = revenueGrowthRate,
                    PendingPayments = pendingPayments,
                    OverdueInvoices = overdueInvoices
                },
                UpcomingEvents = new {
                    ContractsExpiring = contractsExpiringInNext30Days.Count,
                    ExpiringContracts = contractsExpiringInNext30Days.Take(5).ToList() // Show top 5
                },
                Alerts = new List<object>()
                    .Concat(overdueInvoices > 0 ? new[] { new { Type = "Warning", Message = $"{overdueInvoices} overdue invoice(s)" } } : Array.Empty<object>())
                    .Concat(contractsExpiringInNext30Days.Count > 0 ? new[] { new { Type = "Info", Message = $"{contractsExpiringInNext30Days.Count} contract(s) expiring in 30 days" } } : Array.Empty<object>())
                    .Concat(occupancyRate < 80 ? new[] { new { Type = "Warning", Message = $"Low occupancy rate: {occupancyRate}%" } } : Array.Empty<object>())
                    .ToList()
            };

            _logger.LogInformation("Generated dashboard summary - {OccupancyRate}% occupancy, ${MonthlyRevenue} revenue", 
                occupancyRate, monthlyRevenue);
            return ApiResponse<object>.SuccessResponse(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating dashboard summary");
            return ApiResponse<object>.ErrorResponse("Error generating dashboard summary");
        }
    }

    public async Task<ApiResponse<byte[]>> ExportToCsvAsync(string reportType, DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var now = DateTime.UtcNow;
            var startDate = fromDate ?? now.AddMonths(-12);
            var endDate = toDate ?? now;

            byte[] csvData = reportType.ToLower() switch
            {
                "tenants" => await ExportTenantsToCSV(),
                "rooms" => await ExportRoomsToCSV(),
                "invoices" => await ExportInvoicesToCSV(startDate, endDate),
                "payments" => await ExportPaymentsToCSV(startDate, endDate),
                _ => throw new ArgumentException($"Unknown report type: {reportType}")
            };

            _logger.LogInformation("Exported {ReportType} data to CSV", reportType);
            return ApiResponse<byte[]>.SuccessResponse(csvData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting {ReportType} to CSV", reportType);
            return ApiResponse<byte[]>.ErrorResponse("Error exporting data to CSV");
        }
    }

    private async Task<byte[]> ExportTenantsToCSV()
    {
        var tenants = await _context.Tenants
            .Include(t => t.Room)
            .Select(t => new {
                t.Id,
                FirstName = t.FirstName,
                LastName = t.LastName,
                Email = t.Email,
                PhoneNumber = t.PhoneNumber,
                RoomNumber = t.Room != null ? t.Room.RoomNumber : "",
                MonthlyRent = t.MonthlyRent,
                SecurityDeposit = t.SecurityDeposit,
                IsActive = t.IsActive,
                ContractStart = t.ContractStartDate,
                ContractEnd = t.ContractEndDate,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Id,FirstName,LastName,Email,PhoneNumber,RoomNumber,MonthlyRent,SecurityDeposit,IsActive,ContractStart,ContractEnd,CreatedAt");
        
        foreach (var tenant in tenants)
        {
            csv.AppendLine($"{tenant.Id},{tenant.FirstName},{tenant.LastName},{tenant.Email},{tenant.PhoneNumber},{tenant.RoomNumber},{tenant.MonthlyRent},{tenant.SecurityDeposit},{tenant.IsActive},{tenant.ContractStart:yyyy-MM-dd},{tenant.ContractEnd:yyyy-MM-dd},{tenant.CreatedAt:yyyy-MM-dd}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private async Task<byte[]> ExportRoomsToCSV()
    {
        var rooms = await _context.Rooms
            .Include(r => r.Tenants.Where(t => t.IsActive))
            .Select(r => new {
                r.Id,
                r.RoomNumber,
                r.Type,
                r.Floor,
                r.Status,
                r.MonthlyRent,
                CurrentTenant = r.Tenants.Where(t => t.IsActive).FirstOrDefault() != null 
                    ? $"{r.Tenants.Where(t => t.IsActive).First().FirstName} {r.Tenants.Where(t => t.IsActive).First().LastName}"
                    : "",
                IsOccupied = r.Tenants.Any(t => t.IsActive),
                r.CreatedAt
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Id,RoomNumber,RoomType,Floor,Status,MonthlyRent,CurrentTenant,IsOccupied,CreatedAt");
        
        foreach (var room in rooms)
        {
            csv.AppendLine($"{room.Id},{room.RoomNumber},{room.Type},{room.Floor},{room.Status},{room.MonthlyRent},{room.CurrentTenant},{room.IsOccupied},{room.CreatedAt:yyyy-MM-dd}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private async Task<byte[]> ExportInvoicesToCSV(DateTime startDate, DateTime endDate)
    {
        var invoices = await _context.Invoices
            .Include(i => i.Tenant)
            .Include(i => i.Room)
            .Where(i => i.IssueDate >= startDate && i.IssueDate <= endDate)
            .Select(i => new {
                i.Id,
                i.InvoiceNumber,
                TenantName = $"{i.Tenant.FirstName} {i.Tenant.LastName}",
                RoomNumber = i.Room.RoomNumber,
                i.MonthlyRent,
                i.AdditionalCharges,
                i.Discount,
                i.TotalAmount,
                i.PaidAmount,
                i.RemainingBalance,
                i.Status,
                i.IssueDate,
                i.DueDate
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Id,InvoiceNumber,TenantName,RoomNumber,MonthlyRent,AdditionalCharges,Discount,TotalAmount,PaidAmount,RemainingBalance,Status,IssueDate,DueDate");
        
        foreach (var invoice in invoices)
        {
            csv.AppendLine($"{invoice.Id},{invoice.InvoiceNumber},{invoice.TenantName},{invoice.RoomNumber},{invoice.MonthlyRent},{invoice.AdditionalCharges},{invoice.Discount},{invoice.TotalAmount},{invoice.PaidAmount},{invoice.RemainingBalance},{invoice.Status},{invoice.IssueDate:yyyy-MM-dd},{invoice.DueDate:yyyy-MM-dd}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private async Task<byte[]> ExportPaymentsToCSV(DateTime startDate, DateTime endDate)
    {
        var payments = await _context.Payments
            .Include(p => p.Invoice)
                .ThenInclude(i => i.Tenant)
            .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate)
            .Select(p => new {
                p.Id,
                PaymentReference = p.ReferenceNumber,
                TenantName = $"{p.Invoice.Tenant.FirstName} {p.Invoice.Tenant.LastName}",
                InvoiceNumber = p.Invoice.InvoiceNumber,
                p.Amount,
                PaymentMethod = p.Method,
                p.PaymentDate,
                p.IsVerified,
                Description = p.Notes
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Id,PaymentReference,TenantName,InvoiceNumber,Amount,PaymentMethod,PaymentDate,IsVerified,Description");
        
        foreach (var payment in payments)
        {
            csv.AppendLine($"{payment.Id},{payment.PaymentReference},{payment.TenantName},{payment.InvoiceNumber},{payment.Amount},{payment.PaymentMethod},{payment.PaymentDate:yyyy-MM-dd},{payment.IsVerified},{payment.Description}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }
}
