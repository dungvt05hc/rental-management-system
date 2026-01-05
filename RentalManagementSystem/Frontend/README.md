# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Rental Management System - Frontend

A modern React application built with TypeScript, Vite, and Tailwind CSS for managing rental properties, tenants, invoices, and payments.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Dashboard**: Overview of occupancy rates, revenue, and key metrics
- **Room Management**: CRUD operations for rental rooms
- **Tenant Management**: Complete tenant lifecycle management
- **Invoice Management**: Automated invoice generation and tracking
- **Payment Management**: Payment processing and tracking
- **Reports**: Comprehensive reporting and analytics
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Tech Stack

- **React 19** - UI library with modern features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Axios** - HTTP client for API calls
- **React Hook Form** - Form handling and validation
- **Lucide React** - Beautiful icons

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard components
│   └── layout/         # Layout components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── services/           # API service functions
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── main.tsx           # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on https://localhost:7041

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building for Production

```bash
npm run build
```

### Testing

```bash
npm run test
```

## API Integration

The frontend connects to the .NET 8 Web API backend. Configure the API URL in the `.env` file:

```
VITE_API_BASE_URL=https://localhost:7041/api
```

## Authentication

The application uses JWT tokens for authentication. Demo credentials:

- **Admin**: admin@rentalmanagement.com / Admin123!
- **Manager**: manager@rentalms.com / Manager123!
- **Staff**: staff@rentalms.com / Staff123!

## Features Overview

### Dashboard
- Real-time occupancy statistics
- Revenue tracking
- Payment status overview
- Quick action shortcuts

### Room Management
- Add, edit, and delete rooms
- Track room status (Available, Occupied, Maintenance)
- Room assignment to tenants
- Rent amount management

### Tenant Management
- Complete tenant profiles
- Check-in/check-out tracking
- Emergency contact information
- Tenant status management

### Invoice Management
- Automatic monthly invoice generation
- Invoice status tracking
- Payment association
- Overdue invoice alerts

### Payment Management
- Record payments against invoices
- Multiple payment methods
- Payment history tracking
- Revenue reporting

### Reports
- Occupancy reports
- Revenue reports
- Monthly/yearly summaries
- Export capabilities

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow React functional component patterns
- Use custom hooks for business logic
- Implement proper error handling
- Write meaningful component and function names

### State Management
- Use React Query for server state
- Use React Context for global client state
- Use local state for component-specific data
- Implement proper loading and error states

### Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use semantic HTML elements

### API Integration
- All API calls through service functions
- Proper error handling and response types
- Loading states for async operations
- Optimistic updates where appropriate

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and patterns
2. Write TypeScript types for all new features
3. Add proper error handling
4. Test components in different screen sizes
5. Update documentation for new features

## Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5152/api

# App Configuration  
VITE_APP_NAME=Rental Management System
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_DEBUGGING=true
```

## Deployment

The application can be deployed to any static hosting service:

1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Configure environment variables for production
4. Ensure proper CORS configuration on the backend

## License

This project is licensed under the MIT License.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
