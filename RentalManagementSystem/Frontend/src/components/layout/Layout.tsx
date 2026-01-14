import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';
import { 
  Home, 
  Building, 
  Users, 
  FileText, 
  CreditCard, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Package,
  Settings,
  UserCog,
  Globe
} from 'lucide-react';
import { useState } from 'react';
import { LanguageSwitcher, LanguageSwitcherCompact } from '../LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';
import { canAccessFeature } from '../../utils/accessControl';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: t('dashboard.title', 'Dashboard'), href: '/', icon: Home, feature: 'dashboard' as const },
    { name: t('rooms.title', 'Rooms'), href: '/rooms', icon: Building, feature: 'rooms' as const },
    { name: t('tenants.title', 'Tenants'), href: '/tenants', icon: Users, feature: 'tenants' as const },
    { name: t('invoices.title', 'Invoices'), href: '/invoices', icon: FileText, feature: 'invoices' as const },
    { name: t('items.title', 'Items'), href: '/items', icon: Package, feature: 'items' as const },
    { name: t('payments.title', 'Payments'), href: '/payments', icon: CreditCard, feature: 'payments' as const },
    { name: t('reports.title', 'Reports'), href: '/reports', icon: BarChart3, feature: 'reports' as const },
    { name: t('languages.title', 'Languages'), href: '/admin/languages', icon: Globe, feature: 'languages' as const },
    { name: t('users.title', 'User Management'), href: '/users', icon: UserCog, feature: 'users' as const },
    { name: t('system.title', 'System'), href: '/system', icon: Settings, feature: 'system' as const },
  ];

  const visibleNavigation = navigation.filter((item) => canAccessFeature(user, item.feature));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex w-64 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex flex-1 flex-col pt-5 pb-4">
            {/* Language Switcher for Mobile Sidebar */}
            <div className="px-4 pb-4 border-b border-gray-200">
              <LanguageSwitcherCompact />
            </div>
            
            <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500">{user?.roles?.[0] || 'User'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col pt-5 pb-4 overflow-y-auto">
            {/* Language Switcher for Desktop Sidebar */}
            <div className="px-4 pb-4 border-b border-gray-200">
              <LanguageSwitcher />
            </div>
            
            <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="group block w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-500">{user?.roles?.[0] || 'User'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top nav */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            {/* Language Switcher for Mobile Top Bar */}
            <div className="flex-1 flex justify-center">
              <LanguageSwitcherCompact />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
