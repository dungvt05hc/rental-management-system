import type { ReactNode } from 'react';
import { AlertTriangle, Check, Circle, Clock, Contrast, Wrench, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';
import { getStatusStyle } from '../../utils/statusStyles';
import type { StatusShape } from '../../utils/statusStyles';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Tên trạng thái nghiệp vụ. Có giá trị này thì variant bị bỏ qua. */
  status?: string;
  size?: BadgeSize;
  /**
   * Tắt hình khối. Chỉ dùng khi chip đứng một mình và đã có chữ rõ ràng —
   * KHÔNG tắt trong bảng: hình khối là thứ duy nhất phân biệt được năm trạng
   * thái khi in đen trắng hoặc với người mù màu đỏ-lục.
   */
  hideShape?: boolean;
  className?: string;
}

const SHAPE_ICONS: Record<StatusShape, LucideIcon> = {
  ring: Circle,
  dot: Circle,
  wrench: Wrench,
  alert: AlertTriangle,
  check: Check,
  half: Contrast,
  clock: Clock,
  cross: X,
};

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input text-ink',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-2xs',
  md: 'h-6 gap-1.5 px-2 text-xs',
};

const iconSizes: Record<BadgeSize, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
};

/**
 * Chip trạng thái.
 *
 * Bo góc 4px chứ không phải viên thuốc: viên thuốc ăn thêm ~16px chiều ngang
 * mỗi chip trong bảng dày, và hình chữ nhật canh thẳng được với mép cột.
 *
 * Không có hiệu ứng hover — chip là nhãn để đọc, không phải nút để bấm.
 */
export function Badge({
  children,
  variant = 'default',
  status,
  size = 'md',
  hideShape = false,
  className,
}: BadgeProps) {
  const style = status ? getStatusStyle(status) : null;
  const Icon = style ? SHAPE_ICONS[style.shape] : null;

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center rounded-sm font-medium whitespace-nowrap',
        sizes[size],
        style ? style.className : variants[variant],
        className
      )}
    >
      {Icon && !hideShape && (
        <Icon
          aria-hidden="true"
          strokeWidth={2.5}
          className={cn(
            iconSizes[size],
            'shrink-0',
            // ● đặc và ○ rỗng dùng chung một icon, khác nhau ở chỗ có tô ruột.
            style?.shape === 'dot' && 'fill-current'
          )}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
