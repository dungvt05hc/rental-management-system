import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { getDefaultRoute } from '../../utils/accessControl';

export function NoAccessPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
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
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            You do not have permission to view this page. If you believe this is a mistake,
            contact an administrator.
          </p>
          <div className="flex justify-end">
            <Button asChild>
              <Link to={fallbackRoute}>Go back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
