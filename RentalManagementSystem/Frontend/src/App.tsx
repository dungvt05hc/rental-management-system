import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationContainer } from './components/ui/NotificationContainer';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { NoAccessPage } from './components/auth/NoAccessPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { RoomsPage } from './components/rooms/RoomsPage';
import { TenantsPage } from './components/tenants/TenantsPage';
import { InvoicesPage } from './components/invoices/InvoicesPage';
import { InvoiceFormPage } from './components/invoices/InvoiceFormPage';
import { InvoiceDetailPage } from './components/invoices/InvoiceDetailPage';
import { PaymentsPage } from './components/payments/PaymentsPage';
import { PaymentFormPage } from './components/payments/PaymentFormPage';
import { ReportsPage } from './components/dashboard/ReportsPage';
import { ItemsPage } from './components/items/ItemsPage';
import SystemManagement from './components/SystemManagement/SystemManagement';
import { LanguageManagement } from './components/admin/LanguageManagement';
import { UserManagementPage } from './components/user-management';
import { CreateUserPage } from './components/user-management/CreateUserPage';
import type { ReactNode } from 'react';
import './index.css'
import { LocalizationProvider } from './contexts/LocalizationContext'
import { ToastProvider } from './contexts/ToastContext';
import { canAccessFeature, getDefaultRoute, type FeatureKey } from './utils/accessControl';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

interface ProtectedRouteProps {
  children: ReactNode;
  feature: FeatureKey;
}

function ProtectedRoute({ children, feature }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessFeature(user, feature)) {
    return <Navigate to="/no-access" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/no-access" element={<NoAccessPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute feature="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute feature="rooms">
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute feature="tenants">
            <TenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute feature="invoices">
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/new"
        element={
          <ProtectedRoute feature="invoices">
            <InvoiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute feature="invoices">
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id/edit"
        element={
          <ProtectedRoute feature="invoices">
            <InvoiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/items"
        element={
          <ProtectedRoute feature="items">
            <ItemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute feature="payments">
            <PaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments/new"
        element={
          <ProtectedRoute feature="payments">
            <PaymentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments/:id/edit"
        element={
          <ProtectedRoute feature="payments">
            <PaymentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute feature="reports">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/system"
        element={
          <ProtectedRoute feature="system">
            <SystemManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/languages"
        element={
          <ProtectedRoute feature="languages">
            <LanguageManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute feature="users">
            <UserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <ProtectedRoute feature="users">
            <CreateUserPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LocalizationProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <ToastProvider>
              <NotificationProvider>
                <div className="App">
                  <AppRoutes />
                  <NotificationContainer />
                </div>
              </NotificationProvider>
            </ToastProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </LocalizationProvider>
  );
}

export default App;
