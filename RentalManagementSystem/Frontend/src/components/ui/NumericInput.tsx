import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from './Input';
import { formatNumber, parseDecimalInput } from '../../utils';

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  label?: string;
  error?: string;
};

/**
 * Ô nhập số theo quy ước Việt Nam: dấu chấm ngăn nghìn, dấu phẩy thập phân.
 *
 * Không dùng `<input type="number">` được: trình duyệt chỉ chấp nhận định dạng
 * số của Anh — gõ "1.500.000" vào đó thì `e.target.value` trả về chuỗi rỗng và
 * số tiền biến mất mà không có lỗi nào hiện ra. Ở đây ô là text, còn việc đọc
 * số giao cho parseDecimalInput.
 *
 * Trong lúc gõ, ô hiển thị đúng những gì người dùng nhập (không tự chèn dấu
 * ngăn nghìn giữa chừng); rời khỏi ô thì hiện lại dạng đã định dạng.
 */
export function NumericInput({ value, onValueChange, onBlur, ...props }: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const formatted =
    value === null || value === undefined || Number.isNaN(value) ? '' : formatNumber(value);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft ?? formatted}
      onChange={(event) => {
        setDraft(event.target.value);
        onValueChange(parseDecimalInput(event.target.value));
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
