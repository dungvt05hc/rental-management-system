import { forwardRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils';

interface CheckboxProps {
  checked?: boolean;
  /** Đã chọn một phần — dùng cho ô "chọn tất cả" ở đầu bảng. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onCheckedChange,
      disabled = false,
      className,
      id,
      ...aria
    },
    ref
  ) => {
    const isOn = checked || indeterminate;

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        className={cn(
          'relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
          'transition-colors duration-100',
          'focus-ring',
          // Ô vuông vẫn 16px cho đúng mật độ bảng, nhưng vùng bấm nở ra 44px
          // bằng pseudo-element nên không đẩy layout. Người đi thu tiền bấm
          // bằng ngón cái, không bấm bằng con trỏ chuột.
          "after:absolute after:content-[''] after:-inset-2.5 max-sm:after:-inset-3.5",
          isOn
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-surface hover:border-ink-muted',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...aria}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        ) : (
          checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        )}
      </button>
    );
  }
);

Checkbox.displayName = 'Checkbox';
