import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface EmptyStateProps {
  /** Icon nhận từ lucide-react. Tự gắn aria-hidden. */
  icon?: ReactNode;
  /** Câu kết luận, không phải nhãn. "Chưa có phòng nào" chứ không phải "Không có dữ liệu". */
  title: string;
  /** Nói người dùng làm gì tiếp theo. */
  description?: string;
  /** Nút mời hành động. Bỏ trống khi trạng thái rỗng là do bộ lọc. */
  action?: ReactNode;
  className?: string;
}

/**
 * Trạng thái rỗng.
 *
 * Phân biệt hai trường hợp rỗng khác hẳn nhau, đừng dùng chung một câu:
 *
 *   RỖNG VÌ CHƯA CÓ GÌ  → mời tạo cái đầu tiên, có nút.
 *   RỖNG VÌ BỘ LỌC      → nói rõ là do lọc, mời bỏ lọc. KHÔNG mời tạo mới:
 *                          thứ họ tìm có thể đang nằm đó, chỉ bị lọc mất.
 *
 * "Không có dữ liệu" hỏng ở chỗ nó không nói được mình đang ở trường hợp nào.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <span className="mb-3 text-ink-muted" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
