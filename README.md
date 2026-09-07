# 🏠 Rental Management System

A comprehensive full-stack rental property management application built with .NET 9 Web API and React TypeScript.

![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)
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
- **.NET 9** Web API
- **Entity Framework Core** with PostgreSQL
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
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js](https://nodejs.org/) (v20 or later)
- [Docker](https://docs.docker.com/get-docker/), for the local PostgreSQL database

### Run it

```bash
./dev.sh
```

That starts PostgreSQL, applies database migrations, seeds an admin account, and
runs both the API and the web app. No configuration needed — on first run the
script generates `.env.dev` with local-only credentials and prints the admin
password it created.

| | |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:5152 |
| Swagger | http://localhost:5152/swagger |
| PostgreSQL | localhost:5433 |
| Sign in | `admin@rentalmanagement.com` — password printed on startup, and stored in `.env.dev` |

```bash
./dev.sh stop                 # stop the database
./dev.sh reset                # wipe the database and start over
./dev.sh migration <Name>     # create an EF Core migration
```

Migrations live in `RentalManagementSystem/Backend/RentalManagement.Api/Migrations/`
and are committed — the API applies them automatically at startup.

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

Both services are described by [`render.yaml`](render.yaml) at the repository
root. See **[DEPLOYMENT.md](DEPLOYMENT.md)** for environment variables, the
first-deploy sequence, and troubleshooting.

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