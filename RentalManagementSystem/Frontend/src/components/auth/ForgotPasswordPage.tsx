import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { authService } from '../../services/auth';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.forgotPasswordTitle', 'Forgot your password?')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t(
              'auth.forgotPasswordSubtitle',
              'Enter your email address and we will send you a link to choose a new password.'
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isSent
                ? t('auth.checkYourEmail', 'Check your email')
                : t('auth.resetPassword', 'Reset password')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSent ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-md bg-green-50 p-4">
                  <MailCheck className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                  <p className="text-sm text-green-800">
                    {t(
                      'auth.resetLinkSent',
                      'If this email is in our system, we have sent password reset instructions to it.'
                    )}
                  </p>
                </div>

                <p className="text-sm text-gray-600">
                  {t(
                    'auth.resetLinkSentHint',
                    'The link is valid for one hour. Remember to check your spam folder.'
                  )}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={send}
                  isLoading={isSubmitting}
                  disabled={secondsLeft > 0 || isSubmitting}
                >
                  {secondsLeft > 0
                    ? t('auth.resendIn', 'Resend in {seconds}s').replace(
                        '{seconds}',
                        String(secondsLeft)
                      )
                    : t('auth.resendEmail', 'Resend email')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {t('auth.sendResetLink', 'Send reset link')}
                </Button>
              </form>
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
