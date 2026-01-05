import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useForm } from '../../hooks';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
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
      setError('email', t('auth.emailRequired', 'Email is required'));
      isValid = false;
    } else if (!isValidEmail(values.email)) {
      setError('email', t('auth.validEmailRequired', 'Please enter a valid email address'));
      isValid = false;
    }

    if (!values.password) {
      setError('password', t('auth.passwordRequired', 'Password is required'));
      isValid = false;
    } else if (values.password.length < 6) {
      setError('password', t('auth.passwordMinLength', 'Password must be at least 6 characters'));
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
            {t('auth.signInToAccount', 'Sign in to your account')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.welcomeMessage', 'Welcome to the Rental Management System')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.login', 'Login')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('auth.email', 'Email Address')}
                type="email"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                error={errors.email}
                placeholder={t('auth.enterEmail', 'Enter your email')}
                required
              />

              <Input
                label={t('auth.password', 'Password')}
                type="password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                error={errors.password}
                placeholder={t('auth.enterPassword', 'Enter your password')}
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {t('auth.signIn', 'Sign In')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.needAccount', 'Need an account?')}{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  {t('auth.registerHere', 'Register here')}
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                {t('auth.forgotPassword', 'Forgot your password?')}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">{t('auth.demoCredentials', 'Demo Credentials')}</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>{t('auth.admin', 'Admin')}:</strong> admin@rentalmanagement.com / Admin123!</p>
              <p><strong>{t('auth.manager', 'Manager')}:</strong> manager@rentalms.com / Manager123!</p>
              <p><strong>{t('auth.staff', 'Staff')}:</strong> staff@rentalms.com / Staff123!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
