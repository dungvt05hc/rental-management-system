import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Alert, Button } from '../ui';
import { authService } from '../../services/auth';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import { AuthLink, AuthShell } from './AuthShell';

// Cùng kiểm tra hình dạng token như ResetPasswordPage: token của Identity là
// base64 của một khối đã ký, nên link bị mail client bẻ dòng hay cắt ngắn lộ ra
// ngay ở đây thay vì thành một lỗi khó hiểu từ server.
const TOKEN_FORMAT = /^[A-Za-z0-9+/=_-]{20,}$/;

type ConfirmState =
  | { status: 'confirming' }
  | { status: 'confirmed'; message: string }
  | { status: 'failed'; message: string };

export function ConfirmEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [state, setState] = useState<ConfirmState>({ status: 'confirming' });
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>();

  // StrictMode gọi effect hai lần ở môi trường dev. Token xác nhận dùng một
  // lần, nên lần gọi thứ hai sẽ thất bại và ghi đè kết quả thành công của lần
  // đầu — người dùng thấy báo lỗi cho một địa chỉ vừa xác nhận xong.
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (hasSubmitted.current) {
      return;
    }
    hasSubmitted.current = true;

    const isLinkUsable = isValidEmail(email) && TOKEN_FORMAT.test(token);

    if (!isLinkUsable) {
      setState({
        status: 'failed',
        message: t(
          'auth.invalidConfirmationLink',
          'This confirmation link is incomplete or malformed. Request a new one below.'
        )
      });
      return;
    }

    void (async () => {
      const response = await authService.confirmEmail({ email, token });

      setState(
        response.success
          ? {
              status: 'confirmed',
              message:
                response.message ??
                t('auth.emailConfirmed', 'Your email address is confirmed. You can sign in now.')
            }
          : {
              status: 'failed',
              message:
                response.message ??
                t(
                  'auth.confirmEmailFailed',
                  'This confirmation link is not valid. It may have expired.'
                )
            }
      );
    })();
  }, [email, token, t]);

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(undefined);

    try {
      const response = await authService.resendConfirmation({ email });

      setResendMessage(
        response.message ??
          t(
            'auth.confirmationResent',
            'If that address belongs to an account waiting for confirmation, we have sent a new link to it'
          )
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.confirmEmailTitle', 'Confirm your email address')}
      footer={<AuthLink to="/login">{t('auth.backToLogin', 'Back to sign in')}</AuthLink>}
    >
      <div className="flex flex-col gap-4">
        {state.status === 'confirming' && (
          <p
            className="flex items-center justify-center gap-2 text-sm text-ink-muted"
            role="status"
          >
            <Loader2 data-allow-motion className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('auth.confirmingEmail', 'Confirming your email address…')}
          </p>
        )}

        {state.status === 'confirmed' && (
          <>
            <Alert variant="success" title={t('auth.emailConfirmedTitle', 'Address confirmed')}>
              {state.message}
            </Alert>
            <Button type="button" fullWidth onClick={() => navigate('/login')}>
              {t('auth.signIn', 'Sign In')}
            </Button>
          </>
        )}

        {state.status === 'failed' && (
          <>
            <Alert variant="error" title={t('auth.confirmEmailFailedTitle', 'Link not usable')}>
              {state.message}
            </Alert>

            {/* Không có đường này thì một token hết hạn là ngõ cụt vĩnh viễn:
                tài khoản đã tồn tại nên không đăng ký lại được, mã mời thì đã
                tiêu, mà chưa xác nhận email thì không đăng nhập được. */}
            {isValidEmail(email) && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={handleResend}
                  isLoading={isResending}
                >
                  {t('auth.resendConfirmation', 'Send a new confirmation link')}
                </Button>

                {resendMessage && (
                  <p className="text-sm text-ink-muted" role="status">
                    {resendMessage}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AuthShell>
  );
}
