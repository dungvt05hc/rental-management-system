import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

/*
 * Dùng đúng bảng màu trạng thái nghiệp vụ thay vì pastel -50/-200/-800 của
 * Tailwind: người dùng học màu một lần rồi gặp lại cùng ý nghĩa ở cả chip
 * trạng thái lẫn thông báo. Chữ trên nền tint đạt 4.68:1 trở lên.
 */
const variantStyles: Record<AlertVariant, { container: string; icon: string; Icon: LucideIcon }> = {
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

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const { t } = useTranslation();
  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div
      className={cn('flex gap-3 rounded-lg border p-3 sm:p-4', styles.container, className)}
      // Lỗi và cảnh báo cắt ngang việc người dùng đang làm; thành công và thông
      // tin thì đọc sau khi đọc xong câu hiện tại.
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        {title && <h3 className="mb-0.5 text-sm font-semibold">{title}</h3>}
        <div className="text-sm">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
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
      )}
    </div>
  );
}

export const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // `leading-none` cũ cắt cụt dấu trên chữ hoa tiếng Việt.
    <h5 ref={ref} className={cn('mb-0.5 text-sm font-semibold', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';
