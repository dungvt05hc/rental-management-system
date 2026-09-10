import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { authService } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

// Token của Identity là base64 của một khối dữ liệu đã ký, nên chỉ gồm ký tự
// base64 và luôn dài. Kiểm tra này bắt được link bị cắt ngắn hoặc bị mail client
// bẻ dòng — những trường hợp đó báo lỗi ngay tại chỗ tốt hơn là để người dùng
// gõ xong mật khẩu rồi mới nhận lỗi từ server.
const TOKEN_FORMAT = /^[A-Za-z0-9+/=_-]{20,}$/;

// Khớp với Identity password policy cấu hình ở Program.cs:
// RequiredLength = 10, RequireUppercase, RequireLowercase, RequireDigit.
// RequireNonAlphanumeric đang tắt nên không liệt kê ở đây.
interface PasswordRule {
  key: string;
  label: string;
  isMet: (password: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'auth.passwordRuleLength',
    label: 'At least 10 characters',
    isMet: (password) => password.length >= 10
  },
  {
    key: 'auth.passwordRuleUppercase',
    label: 'One uppercase letter',
    isMet: (password) => /[A-Z]/.test(password)
  },
  {
    key: 'auth.passwordRuleLowercase',
    label: 'One lowercase letter',
    isMet: (password) => /[a-z]/.test(password)
  },
  {
    key: 'auth.passwordRuleDigit',
    label: 'One number',
    isMet: (password) => /[0-9]/.test(password)
  }
];

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [policyErrors, setPolicyErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLinkUsable = isValidEmail(email) && TOKEN_FORMAT.test(token);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.isMet(password) })),
    [password]
  );

  const meetsPolicy = ruleResults.every((rule) => rule.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetsPolicy) {
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError(t('auth.passwordsDoNotMatch', 'The two passwords do not match'));
      return;
    }

    setConfirmError(undefined);
    setSubmitError(undefined);
    setPolicyErrors([]);
    setIsSubmitting(true);

    try {
      const response = await authService.resetPassword({ email, token, newPassword: password });

      if (!response.success) {
        setSubmitError(
          response.message ??
            t('auth.resetPasswordFailed', 'The password could not be reset. Request a new link.')
        );
        setPolicyErrors(response.errors ?? []);
        return;
      }

      // Mật khẩu mới làm mọi token cũ hết hiệu lực, nên bắt buộc quay về đăng nhập.
      showSuccess(t('auth.resetPasswordSuccess', 'Password reset successfully'));
      navigate('/login', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.resetPasswordTitle', 'Choose a new password')}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.resetPassword', 'Reset password')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLinkUsable ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('auth.resettingPasswordFor', 'Resetting the password for')}{' '}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>

                <div>
                  <Input
                    label={t('auth.newPassword', 'New password')}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.enterNewPassword', 'Enter your new password')}
                    autoComplete="new-password"
                    autoFocus
                    required
                  />

                  <ul className="mt-2 space-y-1">
                    {ruleResults.map((rule) => (
                      <li
                        key={rule.key}
                        className={`flex items-center gap-2 text-sm ${
                          rule.met ? 'text-green-700' : 'text-gray-500'
                        }`}
                      >
                        {rule.met ? (
                          <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                        )}
                        {t(rule.key, rule.label)}
                      </li>
                    ))}
                  </ul>
                </div>

                <Input
                  label={t('auth.confirmNewPassword', 'Confirm new password')}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmError}
                  placeholder={t('auth.reenterNewPassword', 'Re-enter your new password')}
                  autoComplete="new-password"
                  required
                />

                {submitError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{submitError}</p>
                    {policyErrors.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                        {policyErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to="/forgot-password"
                      className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80"
                    >
                      {t('auth.requestNewLink', 'Request a new reset link')}
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !meetsPolicy}
                >
                  {t('auth.setNewPassword', 'Set new password')}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    {t(
                      'auth.invalidResetLink',
                      'This password reset link is incomplete or malformed. Request a new one.'
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/forgot-password')}
                >
                  {t('auth.requestNewLink', 'Request a new reset link')}
                </Button>
              </div>
            )}

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                {t('auth.backToLogin', 'Back to sign in')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
