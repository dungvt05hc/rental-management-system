import { forwardRef } from 'react';
import { cn } from '../../utils';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Công tắc bật/tắt — chỉ dùng cho thứ có hiệu lực ngay khi gạt.
 * Thứ nào chỉ ghi nhận rồi phải bấm "Lưu" thì dùng Checkbox, không dùng Switch.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id, ...aria }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent',
        'transition-colors duration-100',
        'focus-ring',
        // Vùng bấm nở ra cho ngón cái, không đổi kích thước hiển thị.
        "after:absolute after:content-[''] after:-inset-2 max-sm:after:-inset-2.5",
        // Tắt: line-strong đạt 3.45:1 so với canvas — đủ để thấy có một công
        // tắc ở đó. Xám gray-200 cũ chỉ 1.3:1, nhìn như chỗ trống.
        checked ? 'bg-primary' : 'bg-line-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow-sm',
          // Đây là chuyển động phản hồi trực tiếp cho cú bấm — giữ lại, 120ms.
          'transition-transform duration-120',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
);

Switch.displayName = 'Switch';
