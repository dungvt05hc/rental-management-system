import type { HTMLAttributes } from 'react';
import { cn } from '../../utils';

/**
 * Khối chờ dữ liệu.
 *
 * Không nhấp nháy, không chạy sóng gradient. Chỉ là một khối xám giữ đúng chỗ
 * mà nội dung sắp hiện ra, để trang không nhảy khi dữ liệu về. Hiệu ứng shimmer
 * là chuyển động không do người dùng gây ra — đúng thứ sàn chất lượng loại bỏ,
 * và nó còn kéo GPU chạy liên tục trên điện thoại yếu trong lúc đang chờ mạng.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-sm bg-secondary', className)}
      {...props}
    />
  );
}
