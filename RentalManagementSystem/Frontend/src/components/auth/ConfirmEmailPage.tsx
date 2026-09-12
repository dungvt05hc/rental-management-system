import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Card, CardContent } from '../ui';
import { authService } from '../../services/auth';
import { isValidEmail } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('auth.confirmEmailTitle', 'Confirm your email address')}
          </h2>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {state.status === 'confirming' && (
              <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('auth.confirmingEmail', 'Confirming your email address…')}
              </p>
            )}

            {state.status === 'confirmed' && (
              <div className="flex items-start gap-3 rounded-md bg-green-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                <p className="text-sm text-green-800">{state.message}</p>
              </div>
            )}

            {state.status === 'failed' && (
              <>
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{state.message}</p>
                </div>

                {/* Không có đường này thì một token hết hạn là ngõ cụt vĩnh viễn:
                    tài khoản đã tồn tại nên không đăng ký lại được, mã mời thì đã
                    tiêu, mà chưa xác nhận email thì không đăng nhập được. */}
                {isValidEmail(email) && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleResend}
                      isLoading={isResending}
                      disabled={isResending}
                    >
                      {t('auth.resendConfirmation', 'Send a new confirmation link')}
                    </Button>

                    {resendMessage && (
                      <p className="text-sm text-gray-600">{resendMessage}</p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="text-center">
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
