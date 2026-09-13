import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Button, Input, Skeleton } from '../ui';
import { useForm } from '../../hooks';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import { getDefaultRoute } from '../../utils/accessControl';
import { AuthLink, AuthShell } from './AuthShell';

// type alias chứ không phải interface: useForm ràng buộc
// T extends Record<string, unknown>, mà interface không có index signature ngầm.
type LoginFormData = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string>();

  const { values, errors, setValue, setError } = useForm<LoginFormData>({
    email: '',
    password: '',
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute(user)} replace />;
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

    // Form đăng nhập chỉ kiểm tra có nhập hay chưa, không áp độ dài tối thiểu:
    // policy độ dài chỉ áp khi ĐẶT mật khẩu. Người dùng tạo từ trước còn giữ
    // mật khẩu ngắn hơn, chặn ở đây là khoá họ khỏi tài khoản của chính mình.
    if (!values.password) {
      setError('password', t('auth.passwordRequired', 'Password is required'));
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(undefined);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(values.email, values.password);
    } catch (error) {
      /*
       * Lỗi đăng nhập KHÔNG gắn vào ô mật khẩu nữa.
       *
       * Bản cũ làm `setError('password', ...)`, nên câu "Email hoặc mật khẩu
       * không đúng" hiện ra ngay dưới ô mật khẩu — chỉ vào đúng một ô trong khi
       * lỗi có thể nằm ở ô kia. Nó cũng làm ô mật khẩu mang aria-invalid, tức
       * là nói với trình đọc màn hình rằng giá trị trong ô đó sai định dạng,
       * điều không đúng.
       */
      setSignInError(
        error instanceof Error
          ? error.message
          : t('auth.loginFailed', 'Could not sign in. Check your email and password.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthShell title={t('auth.signInToAccount', 'Sign in to your account')}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.signInToAccount', 'Sign in to your account')}
      footer={
        <>
          {t('auth.needAccount', 'Need an account?')}{' '}
          <AuthLink to="/register">{t('auth.registerHere', 'Register here')}</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {signInError && (
          <Alert variant="error" title={t('auth.loginFailedTitle', 'Sign-in failed')}>
            {signInError}
          </Alert>
        )}

        <Input
          label={t('auth.email', 'Email Address')}
          type="email"
          value={values.email}
          onChange={(e) => setValue('email', e.target.value)}
          error={errors.email}
          placeholder={t('auth.enterEmail', 'Enter your email')}
          autoComplete="email"
          autoFocus
          required
        />

        <div>
          <Input
            label={t('auth.password', 'Password')}
            type="password"
            value={values.password}
            onChange={(e) => setValue('password', e.target.value)}
            error={errors.password}
            placeholder={t('auth.enterPassword', 'Enter your password')}
            autoComplete="current-password"
            required
          />
          <p className="mt-1.5 text-right">
            <AuthLink to="/forgot-password">
              {t('auth.forgotPassword', 'Forgot your password?')}
            </AuthLink>
          </p>
        </div>

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          {t('auth.signIn', 'Sign In')}
        </Button>
      </form>
    </AuthShell>
  );
}
