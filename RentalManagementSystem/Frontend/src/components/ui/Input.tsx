import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils';

// `prefix` là thuộc tính HTML có sẵn (kiểu string, dùng cho RDFa) nên phải loại
// ra trước khi khai báo lại thành ReactNode.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  error?: string;
  label?: string;
  /** Câu giải thích dưới ô. Biến mất khi có lỗi để không đọc hai thứ cùng lúc. */
  hint?: string;
  /** Nội dung dính trong ô, bên trái. Ví dụ biểu tượng tìm kiếm. */
  prefix?: ReactNode;
  /** Nội dung dính trong ô, bên phải. Ví dụ "₫" hoặc "kWh". */
  suffix?: ReactNode;
  /** Bật font số + tabular-nums và canh phải. Dùng cho tiền, chỉ số, ngày. */
  numeric?: boolean;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      type = 'text',
      error,
      label,
      hint,
      prefix,
      suffix,
      numeric = false,
      id,
      required,
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    /*
     * id cũ được sinh từ chính chuỗi label: label.toLowerCase().replace(...).
     * Hỏng ở hai chỗ trong app tiếng Việt: hai ô cùng nhãn "Ghi chú" trên cùng
     * một trang sinh ra id trùng nhau (label bấm vào nhảy sang ô sai), và dấu
     * tiếng Việt lọt thẳng vào thuộc tính id. useId() cho id duy nhất, ổn định
     * qua SSR, không phụ thuộc nội dung nhãn.
     */
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
            {label}
            {required && (
              <>
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
                <span className="sr-only"> (bắt buộc)</span>
              </>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <span
              className="pointer-events-none absolute left-3 flex items-center text-ink-muted"
              aria-hidden="true"
            >
              {prefix}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'h-10 w-full rounded-md border bg-surface px-3 text-sm text-ink',
              'transition-colors duration-100',
              'placeholder:text-ink-muted',
              'focus-ring',
              'max-sm:min-h-touch',
              // Viền: line-strong đạt 3.88:1, ngưỡng WCAG 1.4.11 cho thành phần
              // tương tác là 3:1. Viền lỗi phải đậm hơn nữa vì nó mang thông tin.
              error ? 'border-destructive' : 'border-input hover:border-ink-muted',
              'disabled:cursor-not-allowed disabled:bg-secondary disabled:text-ink-muted disabled:opacity-100',
              // readOnly khác disabled: vẫn chọn và chép được, chỉ không sửa.
              readOnly && 'bg-secondary',
              prefix && 'pl-9',
              suffix && 'pr-12',
              numeric && 'numeric text-right',
              className
            )}
            {...props}
          />

          {suffix && (
            <span
              className="pointer-events-none absolute right-3 flex items-center text-sm text-ink-muted"
              aria-hidden="true"
            >
              {suffix}
            </span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
