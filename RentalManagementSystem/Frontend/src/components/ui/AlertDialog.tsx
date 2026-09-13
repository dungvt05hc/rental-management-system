import * as React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useTranslation } from '../../hooks/useTranslation';

export type AlertType = 'default' | 'destructive' | 'warning' | 'success' | 'info';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: AlertType;
}

/*
 * Hộp xác nhận.
 *
 * Dựng trên Radix AlertDialog thay vì hai thẻ <div> fixed như trước. Bản cũ
 * thiếu bốn thứ mà một hộp xác nhận bắt buộc phải có: bẫy tiêu điểm (Tab đi
 * thẳng ra trang phía sau), đóng bằng Escape, role="alertdialog" cho trình đọc
 * màn hình, và khoá cuộn nền. Ngoài ra nút X cũ đặt `absolute` trong một thẻ
 * không `relative` nên nó bay về góc màn hình chứ không nằm ở góc hộp.
 *
 * Radix trả tiêu điểm về đúng phần tử đã mở hộp khi đóng — quan trọng với bàn
 * phím, và nó là lý do không tự viết lại bằng tay.
 */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = 'default',
}: AlertDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const visuals: Record<AlertType, { Icon: typeof AlertCircle; icon: string; confirm: string }> = {
    destructive: { Icon: XCircle, icon: 'text-status-overdue', confirm: 'bg-destructive hover:bg-destructive-hover' },
    warning: { Icon: AlertCircle, icon: 'text-status-maintenance', confirm: 'bg-status-maintenance hover:bg-status-maintenance/90' },
    success: { Icon: CheckCircle, icon: 'text-status-paid', confirm: 'bg-status-paid hover:bg-status-paid/90' },
    info: { Icon: Info, icon: 'text-primary', confirm: 'bg-primary hover:bg-primary-hover' },
    default: { Icon: AlertCircle, icon: 'text-ink-muted', confirm: 'bg-primary hover:bg-primary-hover' },
  };
  const { Icon, icon, confirm } = visuals[variant];

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface shadow-dialog"
          onEscapeKeyDown={isLoading ? (event) => event.preventDefault() : undefined}
        >
          <div className="flex gap-3 p-4 sm:p-5">
            <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${icon}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <AlertDialogPrimitive.Title className="text-lg font-semibold text-ink">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end sm:p-5">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                disabled={isLoading}
                className="focus-ring inline-flex h-10 min-h-touch items-center justify-center rounded-md border border-input bg-surface px-4 text-sm font-medium text-ink transition-colors duration-100 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
              >
                {cancelText ?? t('common.cancel', 'Huỷ')}
              </button>
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              aria-busy={isLoading || undefined}
              className={`focus-ring inline-flex h-10 min-h-touch items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 ${confirm}`}
            >
              {isLoading && (
                <svg data-allow-motion className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isLoading ? t('common.loading', 'Đang xử lý…') : (confirmText ?? t('common.confirm', 'Xác nhận'))}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

/**
 * Alert Dialog Root Component
 */
const AlertDialogRoot = AlertDialogPrimitive.Root;

/**
 * Alert Dialog Trigger Component
 */
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/**
 * Alert Dialog Portal Component
 */
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/**
 * Alert Dialog Overlay Component
 */
const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={`fixed inset-0 z-50 bg-ink/50 ${
      className || ''
    }`}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

/**
 * Alert Dialog Content Component
 */
const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-line bg-surface p-6 shadow-dialog rounded-lg ${
        className || ''
      }`}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

/**
 * Alert Dialog Header Component
 */
const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-2 text-center sm:text-left ${className || ''}`}
    {...props}
  />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

/**
 * Alert Dialog Footer Component
 */
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${
      className || ''
    }`}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

/**
 * Alert Dialog Title Component
 */
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold ${className || ''}`}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

/**
 * Alert Dialog Description Component
 */
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={`text-sm text-ink-muted ${className || ''}`}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

/**
 * Alert Dialog Action Component
 */
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
      className || ''
    }`}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

/**
 * Alert Dialog Cancel Component
 */
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={`mt-2 inline-flex h-10 items-center justify-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-secondary focus-ring disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 ${
      className || ''
    }`}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
