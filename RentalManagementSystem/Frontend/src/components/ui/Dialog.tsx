import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../utils';

/*
 * Hộp thoại.
 *
 * Dựng trên Radix Dialog. Bản cũ là hai thẻ <div> fixed tự viết, thiếu đúng
 * những thứ làm nên một hộp thoại dùng được bằng bàn phím:
 *
 *   - Không bẫy tiêu điểm: Tab đi xuyên qua hộp ra tới thanh điều hướng phía sau.
 *   - Không đóng bằng Escape.
 *   - Không có role="dialog" / aria-modal, trình đọc màn hình không biết là
 *     phần còn lại của trang đang bị chặn.
 *   - Không khoá cuộn nền: trên điện thoại, vuốt trong hộp làm trang sau cuộn theo.
 *   - Không trả tiêu điểm về nút đã mở hộp khi đóng.
 *
 * API giữ nguyên để 8 màn hình đang dùng không phải sửa gì.
 *
 * Lưu ý: app dùng pattern "Page" cho form (InvoiceFormPage) — hộp thoại chỉ dành
 * cho xác nhận và thao tác ngắn, đừng thêm form dài vào đây.
 */

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        {children}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Giữ lại cho tương thích — Dialog đã tự bọc Portal. */
export function DialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Giữ lại cho tương thích — Dialog đã tự vẽ lớp nền. */
export function DialogOverlay({ className }: { onClick?: () => void; className?: string }) {
  return <div className={cn('fixed inset-0 z-50 bg-ink/50', className)} aria-hidden="true" />;
}

export function DialogTrigger({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn('focus-ring', className)}>
      {children}
    </button>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Content
      /*
       * Radix cảnh báo nếu Content không có Description. Ở đây tắt liên kết
       * aria-describedby thay vì ép mọi hộp phải có câu mô tả — tiêu đề của
       * các hộp trong app này đã là một câu đầy đủ ("Xoá phòng 201?").
       * Hộp nào cần mô tả thì dùng <DialogDescription>, nó vẫn nằm trong nội
       * dung hộp và vẫn được đọc.
       */
      aria-describedby={undefined}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
        'max-h-[calc(100dvh-2rem)] overflow-y-auto',
        'rounded-lg border border-line bg-surface shadow-dialog',
        'focus:outline-none',
        className
      )}
    >
      {children}
    </DialogPrimitive.Content>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // `relative` để nút đóng bám vào góc hộp. Bản cũ đặt nút `absolute` trong
    // một thẻ không định vị, nên nó bay ra góc màn hình.
    <div
      className={cn(
        'relative flex flex-col gap-1 border-b border-line p-4 pr-14 sm:p-5 sm:pr-14',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Title className={cn('text-lg font-semibold text-ink', className)}>
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Description className={cn('text-sm text-ink-muted', className)}>
      {children}
    </DialogPrimitive.Description>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Trên mobile xếp dọc và đảo chiều: hành động chính nằm dưới cùng, gần
        // ngón cái nhất.
        'flex flex-col-reverse gap-2 border-t border-line bg-secondary p-4',
        'sm:flex-row sm:justify-end sm:p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Đóng"
      className={cn(
        'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md',
        'text-ink-muted transition-colors duration-100 hover:bg-secondary hover:text-ink',
        'focus-ring',
        'max-sm:h-touch max-sm:w-touch'
      )}
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
