import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Skeleton } from '../ui';
import { getDefaultRoute } from '../../utils/accessControl';
import { useTranslation } from '../../hooks/useTranslation';
import { AuthShell } from './AuthShell';

export function NoAccessPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const fallbackRoute = getDefaultRoute(user);

  if (isLoading) {
    return (
      <AuthShell title={t('auth.accessDenied', 'Access denied')}>
        <Skeleton className="h-20 w-full" />
      </AuthShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthShell title={t('auth.accessDenied', 'Access denied')}>
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldOff className="h-8 w-8 text-ink-muted" aria-hidden="true" />

        {/*
         * Câu này trước đây bị ghép một mẩu tiếng Anh viết cứng
         * ("contact an administrator.") vào sau chuỗi đã dịch, nên bật tiếng
         * Việt vẫn lòi ra nửa câu tiếng Anh. Nay là một chuỗi trọn vẹn.
         */}
        <p className="text-sm text-ink-muted">
          {t(
            'auth.accessDeniedBody',
            'This account does not have permission to open this page. If that looks wrong, contact an administrator.'
          )}
        </p>

        {/* Nói rõ tài khoản đang dùng là ai — "không có quyền" mà không biết
            đang đăng nhập bằng tài khoản nào thì không tự xử lý được. */}
        {user?.email && (
          <p className="text-sm text-ink">
            {t('auth.signedInAs', 'Signed in as')}{' '}
            <span className="font-medium">{user.email}</span>
          </p>
        )}

        <Button fullWidth onClick={() => navigate(fallbackRoute)}>
          {t('auth.backToSafety', 'Go to a page you can open')}
        </Button>
      </div>
    </AuthShell>
  );
}
