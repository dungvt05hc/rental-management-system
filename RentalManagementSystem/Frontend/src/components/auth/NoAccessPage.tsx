import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { getDefaultRoute } from '../../utils/accessControl';
import { useTranslation } from '../../hooks/useTranslation';

export function NoAccessPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const fallbackRoute = getDefaultRoute(user);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{t('auth.accessDenied', 'Access denied')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('auth.accessDeniedBody', 'This account does not have permission to open this page. If that looks wrong,')}
            contact an administrator.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => navigate(fallbackRoute)}>{t('common.back', 'Back')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
