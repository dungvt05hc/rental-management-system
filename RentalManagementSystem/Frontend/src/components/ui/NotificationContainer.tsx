import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import type { Notification } from '../../contexts/NotificationContext';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils';

const variantStyles: Record<
  Notification['type'],
  { container: string; icon: string; Icon: LucideIcon }
> = {
  success: {
    container: 'border-status-paid/30 bg-status-paid-tint text-status-paid',
    icon: 'text-status-paid',
    Icon: CheckCircle2,
  },
  error: {
    container: 'border-status-overdue/30 bg-status-overdue-tint text-status-overdue',
    icon: 'text-status-overdue',
    Icon: XCircle,
  },
  warning: {
    container: 'border-status-maintenance/30 bg-status-maintenance-tint text-status-maintenance',
    icon: 'text-status-maintenance',
    Icon: AlertTriangle,
  },
  info: {
    container: 'border-primary/30 bg-primary-tint text-primary',
    icon: 'text-primary',
    Icon: Info,
  },
};

function NotificationItem({ notification }: { notification: Notification }) {
  const { t } = useTranslation();
  const { removeNotification } = useNotification();
  const [isExiting, setIsExiting] = useState(false);
  const styles = variantStyles[notification.type];
  const Icon = styles.Icon;

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timeout = setTimeout(() => setIsExiting(true), notification.duration - 200);
      return () => clearTimeout(timeout);
    }
  }, [notification.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeNotification(notification.id), 200);
  };

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 shadow-overlay',
        // Chỉ mờ dần khi biến mất, KHÔNG trượt ngang. Trượt ngang là chuyển
        // động trang trí; mờ dần là đủ để mắt hiểu "cái này vừa đi".
        'transition-opacity duration-200',
        styles.container,
        isExiting ? 'opacity-0' : 'opacity-100'
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        {notification.title && (
          <h3 className="mb-0.5 text-sm font-semibold">{notification.title}</h3>
        )}
        <p className="text-sm break-words">{notification.message}</p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        aria-label={t('common.close', 'Đóng')}
        className={cn(
          '-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          'transition-colors duration-100 hover:bg-ink/10',
          'focus-ring',
          'max-sm:h-touch max-sm:w-touch'
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications } = useNotification();

  return (
    // aria-live phải tồn tại sẵn trong DOM từ trước thì trình đọc màn hình mới
    // đọc nội dung được chèn vào sau. Bản cũ return null khi rỗng, nên thông
    // báo đầu tiên thường bị đọc hụt.
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-96"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto w-full">
          <NotificationItem notification={notification} />
        </div>
      ))}
    </div>
  );
}
