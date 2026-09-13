import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Input } from '../ui';
import { PasswordRuleList } from './PasswordRuleList';
import { meetsPasswordPolicy } from './passwordPolicy';
import { authService } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import { AuthLink, AuthShell } from './AuthShell';

// Token của Identity là base64 của một khối dữ liệu đã ký, nên chỉ gồm ký tự
// base64 và luôn dài. Kiểm tra này bắt được link bị cắt ngắn hoặc bị mail client
// bẻ dòng — những trường hợp đó báo lỗi ngay tại chỗ tốt hơn là để người dùng
// gõ xong mật khẩu rồi mới nhận lỗi từ server.
const TOKEN_FORMAT = /^[A-Za-z0-9+/=_-]{20,}$/;

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

  const meetsPolicy = meetsPasswordPolicy(password);

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
    <AuthShell
      title={t('auth.resetPasswordTitle', 'Choose a new password')}
      subtitle={isLinkUsable ? email : undefined}
      footer={<AuthLink to="/login">{t('auth.backToLogin', 'Back to sign in')}</AuthLink>}
    >
      {isLinkUsable ? (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {submitError && (
            <Alert
              variant="error"
              title={t('auth.resetPasswordFailedTitle', 'Password not changed')}
            >
              <p>{submitError}</p>
              {policyErrors.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                  {policyErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2">
                <AuthLink to="/forgot-password">
                  {t('auth.requestNewLink', 'Request a new reset link')}
                </AuthLink>
              </p>
            </Alert>
          )}

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

            <PasswordRuleList password={password} />
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

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !meetsPolicy}
          >
            {t('auth.setNewPassword', 'Set new password')}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <Alert variant="error" title={t('auth.invalidResetLinkTitle', 'Link not usable')}>
            {t(
              'auth.invalidResetLink',
              'This password reset link is incomplete or malformed. Request a new one.'
            )}
          </Alert>

          <Button type="button" fullWidth onClick={() => navigate('/forgot-password')}>
            {t('auth.requestNewLink', 'Request a new reset link')}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
