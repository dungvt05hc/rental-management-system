import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Thanh tìm kiếm và lọc, DÍNH Ở ĐẦU khi cuộn.
 *
 * Lý do dính: bảng ở đây dài hàng trăm dòng. Cuộn đến dòng thứ tám mươi rồi mới
 * nhận ra cần lọc lại mà phải cuộn ngược lên đầu trang là thao tác hỏng — và
 * cuộn ngược lên còn làm mất luôn chỗ đang đọc.
 *
 * `-mx-4 px-4` bù lại padding ngang của khung trang: không có nó thì khi cuộn,
 * nội dung phía dưới lộ ra ở hai bên mép thanh này.
 *
 * top-16 trên mobile vì thanh điều hướng của Layout đã dính sẵn ở đó (h-16);
 * trên desktop không có thanh đó nên về top-0.
 *
 * KHÔNG đổ bóng ở trạng thái tĩnh. Thanh này phân tách bằng viền dưới, đúng
 * nguyên tắc chung: bóng chỉ dành cho thứ thật sự nổi lên trên.
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'sticky top-16 z-20 lg:top-0',
        '-mx-4 border-b border-line bg-canvas px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}
