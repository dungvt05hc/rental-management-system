import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Chọn nhiều giá trị.
 *
 * Nút mở danh sách chỉ tóm tắt ("Đã chọn 3"); các chip đã chọn nằm thành một
 * hàng riêng bên dưới, mỗi chip gỡ được bằng bàn phím.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: MultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemove = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((option) =>
    value.includes(option.value)
  );

  return (
    /*
     * Các chip đã chọn nằm NGOÀI nút mở danh sách, không nằm trong.
     *
     * Bản cũ đặt chúng bên trong nút, mỗi chip lại có nút X riêng — tức là
     * <button> lồng trong <button>. HTML không cho phép, và hệ quả thật:
     * trình duyệt tự sửa cây DOM theo kiểu khó đoán, còn trình đọc màn hình
     * đọc cả cụm thành một nút duy nhất nên không ai gỡ được một chip bằng
     * bàn phím.
     *
     * Tách ra còn hợp với màn 375px hơn: chip xuống dòng không làm nút mở
     * danh sách cao dần lên rồi đẩy phần còn lại của form xuống.
     */
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-1.5">
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={`flex h-10 min-h-touch w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-sm transition-colors duration-100 hover:border-ink-muted focus-ring disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 ${className}`}
          >
            <span className={selectedOptions.length === 0 ? 'text-ink-muted' : 'truncate text-ink'}>
              {selectedOptions.length === 0
                ? (placeholder ?? t('common.selectItems', 'Chọn…'))
                : selectedOptions.length === 1
                  ? selectedOptions[0].label
                  : t('common.selectedCount', 'Đã chọn {count}', {
                      count: String(selectedOptions.length),
                    })}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </button>
        </PopoverPrimitive.Trigger>

        {selectedOptions.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <li key={option.value}>
                <span className="inline-flex items-center gap-1 rounded-sm bg-primary-tint py-1 pl-2 pr-1 text-xs font-medium text-primary">
                  {option.label}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(event) => handleRemove(option.value, event)}
                    aria-label={t('common.remove', 'Bỏ chọn {label}', { label: option.label })}
                    className="focus-ring rounded-sm p-0.5 transition-colors duration-100 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-line bg-surface p-1 shadow-overlay outline-none"
          sideOffset={4}
        >
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-muted">
                {t('common.noOptions', 'Không có lựa chọn nào')}
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => handleToggle(option.value)}
                    className="focus-ring relative flex min-h-touch w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm hover:bg-secondary sm:min-h-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected ? 'border-primary bg-primary' : 'border-input'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                    </span>
                    <span className={isSelected ? 'font-medium' : ''}>
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
