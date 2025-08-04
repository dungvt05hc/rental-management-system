import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useForm } from '../../hooks';
import { isValidEmail } from '../../utils';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    values,
    errors,
    setValue,
    setError
  } = useForm<LoginFormData>({
    email: '',
    password: '',
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateForm = (): boolean => {
    let isValid = true;

    if (!values.email) {
      setError('email', 'Email is required');
      isValid = false;
    } else if (!isValidEmail(values.email)) {
      setError('email', 'Please enter a valid email address');
      isValid = false;
    }

    if (!values.password) {
      setError('password', 'Password is required');
      isValid = false;
    } else if (values.password.length < 6) {
      setError('password', 'Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError('password', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to the Rental Management System
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                error={errors.email}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Password"
                type="password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                error={errors.password}
                placeholder="Enter your password"
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Need an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Register here
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Admin:</strong> admin@rentalms.com / Admin123!</p>
              <p><strong>Manager:</strong> manager@rentalms.com / Manager123!</p>
              <p><strong>Staff:</strong> staff@rentalms.com / Staff123!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
