# Rental Room Management System - Backend API

## Project Overview

A comprehensive .NET 8 Web API for managing rental room operations, including room management, tenant tracking, invoice generation, payment processing, and reporting.

## Architecture

### Technology Stack
- **.NET 8**: Web API framework
- **Entity Framework Core 9.0.7**: ORM for database operations
- **SQL Server**: Database management system
- **ASP.NET Identity**: Authentication and authorization
- **JWT Bearer Authentication**: Token-based security
- **AutoMapper**: Object-to-object mapping
- **Serilog**: Structured logging
- **FluentValidation**: Input validation
- **Swagger/OpenAPI**: API documentation

### Project Structure

```
RentalManagement.Api/
├── Controllers/              # API endpoints
│   ├── AuthController.cs     # Authentication operations
│   ├── RoomsController.cs    # Room management
│   ├── TenantsController.cs  # Tenant management
│   ├── InvoicesController.cs # Invoice operations
│   ├── PaymentsController.cs # Payment processing
│   └── ReportsController.cs  # Analytics and reporting
├── Data/
│   └── RentalManagementContext.cs # Entity Framework DbContext
├── Models/
│   ├── Entities/            # Database entities
│   │   ├── User.cs          # User management
│   │   ├── Room.cs          # Room information
│   │   ├── Tenant.cs        # Tenant details
│   │   ├── Invoice.cs       # Invoice tracking
│   │   └── Payment.cs       # Payment records
│   └── DTOs/                # Data Transfer Objects
│       ├── AuthDtos.cs      # Authentication DTOs
│       ├── RoomDtos.cs      # Room operation DTOs
│       ├── TenantDtos.cs    # Tenant operation DTOs
│       ├── InvoiceDtos.cs   # Invoice operation DTOs
│       ├── PaymentDtos.cs   # Payment operation DTOs
│       └── CommonDtos.cs    # Shared response models
├── Services/
│   ├── Interfaces/          # Service contracts
│   └── Implementations/     # Service implementations
├── Configurations/
│   └── MappingProfile.cs    # AutoMapper configurations
└── Program.cs               # Application entry point
```

## Core Features

### 1. Authentication & Authorization
- **JWT-based authentication** with role-based access control
- **User roles**: Admin, Manager, Staff
- **User management**: Registration, login, profile updates
- **Password management**: Change password functionality
- **Role assignment**: Admin can assign/remove roles

### 2. Room Management
- **CRUD operations** for room management
- **Room status tracking**: Vacant, Rented, Maintenance
- **Room types**: Single, Double, Suite, Deluxe, Standard
- **Advanced search and filtering** by multiple criteria
- **Room statistics** and occupancy reporting
- **Status management** with proper validation

### 3. Tenant Management
- **Complete tenant lifecycle** management
- **Room assignment** and unassignment functionality
- **Contract tracking** with active status monitoring
- **Tenant search and filtering** capabilities
- **Tenant statistics** and reporting

### 4. Invoice Management
- **Automated monthly invoice generation** for active tenants
- **Invoice status tracking**: Draft, Sent, Paid, Overdue, Cancelled
- **Due date calculations** and overdue detection
- **Invoice search and filtering** by various criteria
- **Payment integration** and balance calculations

### 5. Payment Processing
- **Payment recording** and verification
- **Multiple payment methods**: Cash, Bank Transfer, Credit Card, Check
- **Payment history** and tracking
- **Payment statistics** and monthly summaries
- **Invoice payment integration**

### 6. Reporting & Analytics
- **Occupancy rate reports** with date range filtering
- **Revenue analysis** and monthly breakdown
- **Outstanding payments tracking**
- **Financial summaries** for specified periods
- **Tenant statistics** and demographics
- **Room utilization reports**
- **Payment method distribution analysis**
- **Dashboard summary** with key metrics
- **CSV export functionality**

## Database Schema

### Core Entities

#### User Entity
- Identity-based user management
- Additional profile fields (FirstName, LastName)
- Role-based access control
- Audit fields (CreatedAt, UpdatedAt, IsActive)

#### Room Entity
```csharp
- Id (Primary Key)
- RoomNumber (Unique identifier)
- Type (Enum: Single, Double, Suite, etc.)
- Status (Enum: Vacant, Rented, Maintenance)
- Floor, MonthlyRent, Deposit
- Size, Description
- HasAirConditioning, HasPrivateBathroom
- Audit fields
```

#### Tenant Entity
```csharp
- Id (Primary Key)
- Personal Information (Name, Email, Phone, etc.)
- Contract Details (StartDate, EndDate)
- Room assignment (Foreign Key)
- Emergency Contact Information
- Audit fields
```

#### Invoice Entity
```csharp
- Id (Primary Key)
- Invoice Details (Number, Date, Due Date)
- Amount calculations (Subtotal, Tax, Total)
- Status tracking
- Tenant and Room relationships
- Audit fields
```

#### Payment Entity
```csharp
- Id (Primary Key)
- Payment Details (Amount, Method, Date)
- Verification status
- Invoice relationship
- Transaction reference
- Audit fields
```

### Relationships
- **User → Many Roles** (ASP.NET Identity)
- **Room → Many Tenants** (One-to-Many)
- **Tenant → Many Invoices** (One-to-Many)
- **Room → Many Invoices** (One-to-Many)
- **Invoice → Many Payments** (One-to-Many)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User authentication
- `POST /register` - User registration (Admin only)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `GET /users` - Get all users (Admin/Manager)
- `POST /users/{userId}/roles` - Assign role (Admin)
- `DELETE /users/{userId}/roles` - Remove role (Admin)

### Rooms (`/api/rooms`)
- `GET /` - Get rooms with search/filter
- `GET /{id}` - Get room by ID
- `POST /` - Create room (Admin/Manager)
- `PUT /{id}` - Update room (Admin/Manager)
- `DELETE /{id}` - Delete room (Admin)
- `GET /available` - Get available rooms
- `GET /status/{status}` - Get rooms by status
- `PATCH /{id}/status/{status}` - Change room status
- `GET /statistics` - Room occupancy statistics

### Tenants (`/api/tenants`)
- `GET /` - Get tenants with search/filter
- `GET /{id}` - Get tenant by ID
- `POST /` - Create tenant
- `PUT /{id}` - Update tenant
- `DELETE /{id}` - Delete tenant (Admin)
- `POST /{tenantId}/assign-room` - Assign to room
- `POST /{tenantId}/unassign-room` - Unassign from room
- `GET /active` - Get active tenants
- `GET /unassigned` - Get unassigned tenants
- `GET /room/{roomId}` - Get tenants by room
- `GET /statistics` - Tenant statistics

### Invoices (`/api/invoices`)
- `GET /` - Get invoices with search/filter
- `GET /{id}` - Get invoice by ID
- `POST /` - Create invoice
- `PUT /{id}` - Update invoice
- `DELETE /{id}` - Delete invoice (Admin)
- `POST /generate-monthly` - Generate monthly invoices
- `GET /tenant/{tenantId}` - Get invoices by tenant
- `GET /overdue` - Get overdue invoices
- `POST /{id}/mark-paid` - Mark invoice as paid
- `POST /send-reminders` - Send invoice reminders
- `GET /statistics` - Invoice statistics

### Payments (`/api/payments`)
- `GET /` - Get payments with filtering
- `GET /{id}` - Get payment by ID
- `POST /` - Create payment
- `PUT /{id}` - Update payment (Admin/Manager)
- `DELETE /{id}` - Delete payment (Admin)
- `GET /invoice/{invoiceId}` - Get payments by invoice
- `POST /{id}/verify` - Verify payment
- `GET /statistics` - Payment statistics
- `GET /monthly-summary/{year}` - Monthly payment summary

### Reports (`/api/reports`)
- `GET /occupancy-rate` - Occupancy rate report
- `GET /monthly-revenue/{year}` - Monthly revenue report
- `GET /outstanding-payments` - Outstanding payments report
- `GET /financial-summary` - Financial summary
- `GET /tenant-statistics` - Tenant statistics
- `GET /room-utilization` - Room utilization report
- `GET /payment-method-distribution` - Payment method distribution
- `GET /dashboard-summary` - Dashboard summary
- `GET /export/{reportType}` - Export reports to CSV

## Security Features

### Authentication
- **JWT Bearer tokens** with configurable expiration
- **Role-based authorization** (Admin, Manager, Staff)
- **Secure password hashing** using ASP.NET Identity
- **Input validation** using FluentValidation

### Authorization Matrix
| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| User Management | Full | View | View |
| Room Management | Full | Full | Read/Update Status |
| Tenant Management | Full | Full | Full |
| Invoice Management | Full | Full | Full |
| Payment Management | Full | Full | Create/Read |
| Reports | Full | Full | - |

## Configuration

### Database Connection
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=RentalManagementDb;User Id=sa;Password=123456aA@3;TrustServerCertificate=True"
  }
}
```

### JWT Configuration
```json
{
  "JwtSettings": {
    "SecretKey": "your-super-secret-key-that-is-at-least-32-characters-long",
    "Issuer": "RentalManagement.Api",
    "Audience": "RentalManagement.Client",
    "ExpirationMinutes": 60
  }
}
```

### Logging Configuration
- **Serilog** for structured logging
- **File logging** with daily rolling files
- **Console logging** for development
- **Error tracking** with detailed exception information

## Development Setup

### Prerequisites
- .NET 8 SDK
- SQL Server or SQL Server LocalDB
- Visual Studio 2022 or VS Code

### Getting Started
1. **Clone the repository**
2. **Configure connection string** in `appsettings.json`
3. **Run Entity Framework migrations**:
   ```bash
   dotnet ef database update
   ```
4. **Build and run the application**:
   ```bash
   dotnet build
   dotnet run --launch-profile https
   ```
   Or for HTTP only:
   ```bash
   dotnet run --launch-profile http
   ```
5. **Access Swagger UI** at:
   - **HTTPS**: `https://localhost:7232/swagger` (recommended)
   - **HTTP**: `http://localhost:5152/swagger`

### Database Migration Commands
```bash
# Create new migration
dotnet ef migrations add InitialCreate

# Update database
dotnet ef database update

# Remove last migration
dotnet ef migrations remove
```

## API Documentation

- **Swagger/OpenAPI** documentation available at `/swagger`
- **JWT authentication** integrated in Swagger UI
- **Comprehensive endpoint documentation** with examples
- **Request/Response schemas** with validation rules

## Error Handling

- **Global exception handling** middleware
- **Consistent error response format**
- **Detailed error logging** with Serilog
- **Validation error responses** with field-specific messages

## Performance Considerations

- **Entity Framework optimizations** with proper indexing
- **Async/await patterns** throughout the application
- **Pagination support** for large datasets
- **Efficient database queries** with Include statements
- **Response caching** where appropriate

## Testing

The project structure supports:
- **Unit testing** for business logic
- **Integration testing** for API endpoints
- **Database testing** with in-memory providers
- **Authentication testing** with test tokens

## Deployment Considerations

- **Environment-specific configurations**
- **Database migration strategies**
- **Security key management**
- **Logging configuration** for production
- **Health check endpoints**
- **Docker containerization** support

## Future Enhancements

- **Email notifications** for invoice reminders
- **File upload** for tenant documents
- **Advanced reporting** with charts and graphs
- **Mobile API** optimizations
- **Multi-tenancy** support
- **Integration APIs** for external systems
- **Audit logging** for data changes
- **Backup and recovery** procedures

This backend API provides a solid foundation for a comprehensive rental room management system with robust security, comprehensive features, and excellent scalability potential.
