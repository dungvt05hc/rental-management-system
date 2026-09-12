import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { PasswordRuleList } from './PasswordRuleList';
import { meetsPasswordPolicy } from './passwordPolicy';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
import { useTranslation } from '../../hooks/useTranslation';
import { getDefaultRoute } from '../../utils/accessControl';
import { translate } from '../../utils/i18n';

// Số điện thoại VN: 10 chữ số, đầu 03/05/07/08/09. Cùng luật với
// SelfRegisterDto.VietnamesePhonePattern phía backend — sửa một bên thì phải
// sửa cả bên kia, nếu không form sẽ nhận thứ mà server từ chối.
const VIETNAMESE_PHONE = /^0(3|5|7|8|9)\d{8}$/;

// Đủ để lọc ra chuỗi chưa phải email trước khi tốn một lượt gọi check-email.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Chờ sau khi rời ô email rồi mới hỏi server. Rời ra rồi quay lại ô liên tục là
// chuyện thường khi điền form, mà endpoint check-email có hạn mức theo IP —
// không có khoảng chờ này thì một người điền form cẩn thận cũng có thể tự làm
// mình bị chặn.
const EMAIL_CHECK_DEBOUNCE_MS = 500;

/**
 * Schema được dựng khi component render, không phải lúc import.
 *
 * Thông báo lỗi đi qua translate(), mà translate() chỉ có bản dịch sau khi
 * LocalizationProvider mount. Nếu dựng schema ở module scope, mọi thông báo sẽ
 * đóng băng ở chuỗi tiếng Anh dự phòng.
 */
const buildRegisterSchema = () => z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().trim().email('Please enter a valid email address').max(256),
    phoneNumber: z
      .string()
      .trim()
      .regex(VIETNAMESE_PHONE, 'Phone number must have 10 digits and start with 03, 05, 07, 08 or 09'),
    password: z
      .string()
      .refine(meetsPasswordPolicy, translate('auth.passwordPolicyFailed', 'The password does not meet every rule listed below')),
    confirmPassword: z.string().min(1, translate('auth.confirmPasswordRequired', 'Please re-enter the password')),
    invitationCode: z.string().trim().min(1, translate('auth.invitationCodeRequired', 'An invitation code is required')).max(64)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: translate('auth.passwordsDoNotMatch', 'The two passwords do not match'),
    path: ['confirmPassword']
  });

type RegisterFormValues = z.infer<ReturnType<typeof buildRegisterSchema>>;

/**
 * Kết quả tra cứu trùng email, gắn kèm địa chỉ đã hỏi.
 * Giữ lại địa chỉ là cần thiết: người dùng có thể sửa ô email sau khi câu trả
 * lời đã về, và một cảnh báo "email đã tồn tại" treo lại trên địa chỉ khác là
 * sai rành rành.
 */
interface EmailCheck {
  email: string;
  available: boolean;
}

export function RegisterPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [registeredEmail, setRegisteredEmail] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const [emailToCheck, setEmailToCheck] = useState<string>();
  const [emailCheck, setEmailCheck] = useState<EmailCheck>();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const registerSchema = useMemo(buildRegisterSchema, [t]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      invitationCode: ''
    }
  });

  const { errors } = form.formState;
  const emailValue = form.watch('email');
  const passwordValue = form.watch('password');

  useEffect(() => {
    if (!emailToCheck) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);

      try {
        const response = await authService.checkEmail(emailToCheck);

        if (cancelled) {
          return;
        }

        // Hỏi hụt — mất mạng, hoặc chạm hạn mức — thì im lặng bỏ qua. Đây chỉ
        // là tiện lợi lúc điền form; server vẫn chặn email trùng lúc submit, nên
        // báo lỗi ở đây chỉ làm người dùng hoang mang mà không thêm thông tin gì.
        setEmailCheck(
          response.success && response.data
            ? { email: emailToCheck, available: response.data.available }
            : undefined
        );
      } finally {
        if (!cancelled) {
          setIsCheckingEmail(false);
        }
      }
    }, EMAIL_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailToCheck]);

  // Người đã đăng nhập không có việc gì ở màn hình đăng ký.
  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  const handleEmailBlur = () => {
    const value = form.getValues('email').trim();
    setEmailToCheck(EMAIL_SHAPE.test(value) ? value : undefined);
  };

  const isEmailTaken =
    emailCheck !== undefined &&
    emailCheck.email === emailValue.trim() &&
    !emailCheck.available;

  const isEmailFree =
    emailCheck !== undefined &&
    emailCheck.email === emailValue.trim() &&
    emailCheck.available;

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(undefined);
    setServerErrors([]);

    const response = await authService.register(values);

    if (!response.success) {
      setSubmitError(
        response.message ?? t('auth.registerFailed', 'Registration could not be completed')
      );
      setServerErrors(response.errors ?? []);
      return;
    }

    setRegisteredEmail(response.data?.email ?? values.email.trim());
  };

  if (registeredEmail) {
    return (
      <AuthShell title={t('auth.checkYourInbox', 'Check your inbox')}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  {t(
                    'auth.confirmationEmailSent',
                    'Your account has been created. We sent a confirmation link to'
                  )}{' '}
                  <span className="font-medium text-gray-900">{registeredEmail}</span>.
                </p>
                <p className="text-sm text-gray-600">
                  {t(
                    'auth.confirmBeforeSignIn',
                    'Open that link to confirm your address. You cannot sign in until you do.'
                  )}
                </p>
              </div>
            </div>

            <Link
              to="/login"
              className="block text-center text-sm font-medium text-primary hover:text-primary/80"
            >
              {t('auth.backToLogin', 'Back to sign in')}
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.createYourAccount', 'Create your account')}
      subtitle={t('auth.registerNeedsInvite', 'Registration requires an invitation code from an administrator')}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.register', 'Register')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('auth.firstName', 'First name')}
                error={errors.firstName?.message}
                autoComplete="given-name"
                autoFocus
                {...form.register('firstName')}
              />

              <Input
                label={t('auth.lastName', 'Last name')}
                error={errors.lastName?.message}
                autoComplete="family-name"
                {...form.register('lastName')}
              />
            </div>

            <div>
              <Input
                label={t('auth.email', 'Email Address')}
                type="email"
                error={errors.email?.message}
                autoComplete="email"
                {...form.register('email', { onBlur: handleEmailBlur })}
              />

              {!errors.email && isCheckingEmail && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {t('auth.checkingEmail', 'Checking availability…')}
                </p>
              )}

              {!errors.email && !isCheckingEmail && isEmailTaken && (
                <p className="mt-1 text-sm text-red-600">
                  {t('auth.emailAlreadyRegistered', 'This email address already has an account')}
                </p>
              )}

              {!errors.email && !isCheckingEmail && isEmailFree && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('auth.emailAvailable', 'This email address is available')}
                </p>
              )}
            </div>

            <Input
              label={t('auth.phoneNumber', 'Phone number')}
              type="tel"
              inputMode="numeric"
              placeholder={t('users.phonePlaceholder', '09xxxxxxxx')}
              error={errors.phoneNumber?.message}
              autoComplete="tel"
              {...form.register('phoneNumber')}
            />

            <div>
              <Input
                label={t('auth.password', 'Password')}
                type="password"
                error={errors.password?.message}
                autoComplete="new-password"
                {...form.register('password')}
              />

              <PasswordRuleList password={passwordValue} />
            </div>

            <Input
              label={t('auth.confirmPassword', 'Confirm password')}
              type="password"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              {...form.register('confirmPassword')}
            />

            <div>
              <Input
                label={t('auth.invitationCode', 'Invitation code')}
                placeholder={t('auth.invitationCodePlaceholder', 'ABCDE-FGHJK-LMNPQ-RSTUV')}
                error={errors.invitationCode?.message}
                autoComplete="off"
                className="font-mono uppercase"
                {...form.register('invitationCode')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('auth.invitationCodeHint', 'The code an administrator sent you. It decides what you can access.')}
              </p>
            </div>

            {submitError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{submitError}</p>
                {serverErrors.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                    {serverErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting || isEmailTaken}
            >
              {t('auth.createAccount', 'Create account')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                {t('auth.signIn', 'Sign In')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Khung trang cho các màn hình ngoài vùng đăng nhập, giống LoginPage và
 * ResetPasswordPage.
 */
function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
