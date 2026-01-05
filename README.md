# 🏠 Rental Management System

A comprehensive full-stack rental property management application built with .NET 8 Web API and React TypeScript.

![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Entity Framework](https://img.shields.io/badge/Entity%20Framework-Core-512BD4)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-06B6D4?logo=tailwindcss)

## 📋 Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Manager, Staff)
- Secure user registration and login
- Profile management

### 🏢 Room Management
- Comprehensive room inventory
- Room status tracking (Available, Occupied, Maintenance)
- Pricing and description management
- Advanced filtering and search capabilities

### 👥 Tenant Management
- Complete tenant profiles with contact information
- Identity document management
- Room assignment tracking
- Tenant status monitoring

### 📄 Invoice Management
- Automated invoice generation
- Payment tracking and status updates
- Due date monitoring and overdue alerts
- Comprehensive invoice history

### 💰 Payment Processing
- Multiple payment method support (Cash, Bank Transfer, Check, Credit Card)
- Payment history and transaction tracking
- Financial reporting and statistics
- Receipt management

### 📊 Reporting & Analytics
- Real-time dashboard with key metrics
- Occupancy rate analytics
- Revenue and collection reports
- Monthly and yearly performance summaries
- System alerts and notifications

## 🛠️ Technology Stack

### Backend
- **.NET 8** Web API
- **Entity Framework Core** with SQL Server
- **AutoMapper** for object mapping
- **JWT Authentication**
- **Swagger/OpenAPI** documentation
- **CORS** configuration

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching
- **React Router** for navigation
- **Lucide React** for icons

## 🚀 Getting Started

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18 or later)
- [SQL Server](https://www.microsoft.com/en-us/sql-server) or SQL Server Express

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd RentalManagementSystem/Backend/RentalManagement.Api
   ```

2. **Restore NuGet packages:**
   ```bash
   dotnet restore
   ```

3. **Update the connection string** in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=RentalManagementDB;Trusted_Connection=true;MultipleActiveResultSets=true"
     }
   }
   ```

4. **Run database migrations:**
   ```bash
   dotnet ef database update
   ```

5. **Start the API:**
   ```bash
   dotnet run
   ```

The API will be available at `https://localhost:7232` with Swagger documentation at `https://localhost:7232/swagger`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd RentalManagementSystem/Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file** `.env`:
   ```env
   VITE_API_BASE_URL=https://localhost:7232/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## 📱 Application Screenshots

### Dashboard
- Real-time metrics and KPIs
- System alerts and notifications
- Quick action buttons
- Occupancy and revenue analytics

### Room Management
- Comprehensive room listing with filtering
- Status-based color coding
- Room details and pricing information
- Availability tracking

### Tenant Management
- Detailed tenant profiles
- Contact information management
- Room assignment tracking
- Identity document records

### Financial Management
- Invoice generation and tracking
- Payment processing and history
- Revenue reports and analytics
- Overdue payment alerts

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/{id}` - Get room by ID
- `POST /api/rooms` - Create new room
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/{id}` - Get tenant by ID
- `POST /api/tenants` - Create new tenant
- `PUT /api/tenants/{id}` - Update tenant
- `DELETE /api/tenants/{id}` - Delete tenant

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/{id}` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/{id}` - Update invoice
- `DELETE /api/invoices/{id}` - Delete invoice

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/{id}` - Get payment by ID
- `POST /api/payments` - Record new payment
- `PUT /api/payments/{id}` - Update payment

### Reports
- `GET /api/reports/occupancy` - Get occupancy report
- `GET /api/reports/revenue` - Get revenue report
- `GET /api/reports/monthly/{year}/{month}` - Get monthly report

## 🗃️ Database Schema

The application uses Entity Framework Core with the following main entities:

- **Users** - Authentication and user management
- **Rooms** - Property inventory
- **Tenants** - Tenant information and profiles
- **Invoices** - Billing and invoice management
- **Payments** - Payment tracking and processing

## 🧪 Testing

### Backend Testing
```bash
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet test
```

### Frontend Testing
```bash
cd RentalManagementSystem/Frontend
npm test
```

## 📦 Deployment

### Backend Deployment
1. Publish the application:
   ```bash
   dotnet publish -c Release -o ./publish
   ```

2. Deploy to your preferred hosting platform (Azure, AWS, IIS, etc.)

### Frontend Deployment
1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Responsive design for optimal user experience
- Comprehensive API documentation with Swagger
- Real-time data updates and notifications
- Professional-grade authentication and authorization

## 📞 Support

For support, email vothaidung9611@gmail.com or create an issue in this repository.

---
