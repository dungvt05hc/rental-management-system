import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../utils';

/**
 * Bảng "trần" — giữ nguyên cho những chỗ cần dựng bảng bằng tay.
 *
 * Bảng có dữ liệu thật thì dùng <DataTable>: nó lo luôn phần đổi sang dạng thẻ
 * trên mobile. Bảng trần mà đặt trong khung cuộn ngang trên điện thoại là đúng
 * cái mà sàn chất lượng cấm.
 */
export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-line', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentPropsWithoutRef<'tfoot'>) {
  return (
    <tfoot
      className={cn('border-t border-line bg-secondary font-medium text-ink', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-line',
        // Đổi nền tức thì, không transition: việc của nó là giúp mắt bám một
        // dòng khi rê ngang bảng rộng, mà hiệu ứng mờ dần thì làm chậm đúng
        // việc đó.
        'hover:bg-secondary data-[state=selected]:bg-primary-tint',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        // Chữ thường, không VIẾT HOA: tiếng Việt viết hoa có dấu (ĐẾN HẠN,
        // QUÁ HẠN) làm dấu thanh đụng trần chữ hoa và khó đọc hơn hẳn.
        'h-11 px-3 text-left align-middle text-xs font-semibold text-ink-muted',
        '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle text-sm',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: ComponentPropsWithoutRef<'caption'>) {
  return <caption className={cn('mt-3 text-xs text-ink-muted', className)} {...props} />;
}
