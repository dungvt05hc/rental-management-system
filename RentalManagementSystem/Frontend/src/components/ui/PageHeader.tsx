import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface PageHeaderProps {
  title: string;
  /** Một câu nói màn hình này dùng để làm gì. Bỏ trống nếu tiêu đề đã đủ. */
  description?: string;
  /** Con số tóm tắt đứng ngay cạnh tiêu đề, ví dụ "12 phòng". */
  count?: ReactNode;
  /** Nút hành động. Cái quan trọng nhất đặt cuối cùng để nó nằm ngoài cùng bên phải. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Đầu trang.
 *
 * text-xl chứ không phải text-3xl: tiêu đề trang không phải thứ người dùng cần
 * đọc — họ biết mình vừa bấm vào đâu. Chữ to ở đây chỉ ăn mất chiều cao màn
 * hình của thứ họ thật sự vào để xem.
 *
 * Trên mobile nút hành động chiếm trọn chiều ngang và xuống hàng dưới: ở 375px,
 * nhồi tiêu đề và nút vào một hàng làm nút teo lại dưới ngưỡng bấm 44px.
 */
export function PageHeader({ title, description, count, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {count !== undefined && count !== null && (
            <span className="numeric text-sm text-ink-muted">{count}</span>
          )}
        </div>
        {description && <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
