import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input } from '../ui';
import { authService } from '../../services/auth';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import { AuthLink, AuthShell } from './AuthShell';

// Khoảng chờ trước khi cho gửi lại. Đủ dài để email kịp tới nơi, nên người dùng
// không bấm lại chỉ vì sốt ruột và tự đụng trần rate limit của server.
const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const send = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Phản hồi giống hệt nhau dù địa chỉ có tài khoản hay không, nên không có
      // nhánh nào để phân biệt — cứ gửi xong là sang màn hình xác nhận.
      await authService.forgotPassword({ email: email.trim() });
      setIsSent(true);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError(t('auth.emailRequired', 'Email is required'));
      return;
    }

    if (!isValidEmail(trimmed)) {
      setEmailError(t('auth.validEmailRequired', 'Please enter a valid email address'));
      return;
    }

    setEmailError(undefined);
    await send();
  };

  return (
    <AuthShell
      title={t('auth.forgotPasswordTitle', 'Forgot your password?')}
      subtitle={
        isSent
          ? undefined
          : t(
              'auth.forgotPasswordSubtitle',
              'Enter your email address and we will send you a link to choose a new password.'
            )
      }
      footer={<AuthLink to="/login">{t('auth.backToLogin', 'Back to sign in')}</AuthLink>}
    >
      {isSent ? (
        <div className="flex flex-col gap-4">
          <Alert variant="success" title={t('auth.checkYourEmail', 'Check your email')}>
            {t(
              'auth.resetLinkSent',
              'If this email is in our system, we have sent password reset instructions to it.'
            )}
          </Alert>

          <p className="text-sm text-ink-muted">
            {t(
              'auth.resetLinkSentHint',
              'The link is valid for one hour. Remember to check your spam folder.'
            )}
          </p>

          {/* Đếm ngược nằm ngay trên nút, không phải một dòng chữ rời: người
              dùng cần biết vì sao nút đang mờ, ở đúng chỗ họ đang nhìn. */}
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={send}
            isLoading={isSubmitting}
            disabled={secondsLeft > 0 || isSubmitting}
          >
            {secondsLeft > 0
              ? t('auth.resendIn', 'Resend in {seconds}s', { seconds: secondsLeft })
              : t('auth.resendEmail', 'Resend email')}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label={t('auth.email', 'Email Address')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            placeholder={t('auth.enterEmail', 'Enter your email')}
            autoComplete="email"
            autoFocus
            required
          />

          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            {t('auth.sendResetLink', 'Send reset link')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
