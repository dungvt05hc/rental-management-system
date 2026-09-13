import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Chữ thay thế trong lúc chờ. Không truyền thì giữ nguyên nhãn cũ. */
  loadingText?: string;
  /** Icon đứng trước nhãn. Tự gắn aria-hidden. */
  leadingIcon?: ReactNode;
  /** Icon đứng sau nhãn. Dành cho dropdown/disclosure — KHÔNG dùng để gắn mũi tên trang trí. */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover focus-ring',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-line active:bg-line focus-ring',
  outline: 'border border-input bg-surface text-ink hover:bg-secondary active:bg-line focus-ring',
  ghost: 'text-ink hover:bg-secondary active:bg-line focus-ring',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-hover focus-ring',
};

/*
 * Chiều cao: h-9/h-10/h-11 là cỡ desktop. Trên mobile mọi nút đều bị kéo lên
 * tối thiểu 44px (min-h-touch) — nhân viên đi thu tiền bấm bằng ngón cái, đứng
 * ở hành lang, một tay cầm điện thoại một tay cầm sổ.
 */
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-xs max-sm:min-h-touch max-sm:px-4',
  md: 'h-10 gap-2 px-4 text-sm max-sm:min-h-touch',
  lg: 'h-11 gap-2 px-6 text-base max-sm:min-h-touch',
  icon: 'h-10 w-10 p-0 max-sm:min-h-touch max-sm:min-w-touch',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leadingIcon,
      trailingIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md font-medium',
          // Chỉ chuyển màu, 100ms — phản hồi cho hành động trỏ/bấm của người dùng.
          // Không transform, không scale, không bóng động.
          'transition-colors duration-100',
          // Nút disabled vẫn phải đọc được (nó giải thích vì sao không bấm được),
          // nên giảm độ mờ vừa phải chứ không phải 50%.
          'disabled:cursor-not-allowed disabled:opacity-60',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            // Spinner được miễn trừ prefers-reduced-motion: đóng băng nó lại
            // thành ra báo sai, nhìn như app treo.
            data-allow-motion
            className="h-4 w-4 shrink-0 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leadingIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        {isLoading && loadingText ? loadingText : children}
        {!isLoading && trailingIcon && (
          <span className="shrink-0" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
