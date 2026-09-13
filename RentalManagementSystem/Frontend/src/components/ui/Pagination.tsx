import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Bao nhiêu số trang hiện ra hai bên trang hiện tại. */
const WINDOW = 2;

/**
 * Chuyển trang.
 *
 * Trước đây bốn màn hình danh sách mỗi màn hình chép một bản riêng, lệch nhau cả
 * về cỡ nút lẫn cách tính dải số trang — bản ở Payments luôn vẽ đủ MỌI trang,
 * nên 40 trang là 40 nút tràn ra ngoài màn hình.
 *
 * Trên mobile chỉ còn "trước / sau" và vị trí hiện tại: dãy số trang ở 375px
 * hoặc phải teo dưới ngưỡng bấm 44px, hoặc phải cuộn ngang.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Dải số trang bám quanh trang hiện tại, và luôn giữ đủ bề rộng khi đứng ở
  // đầu hoặc cuối — nếu không, dải nút co lại ở hai đầu làm cả hàng nhảy chỗ.
  const span = WINDOW * 2 + 1;
  const start = Math.max(1, Math.min(page - WINDOW, totalPages - span + 1));
  const end = Math.min(totalPages, start + span - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      aria-label={t('common.pagination', 'Pagination')}
    >
      {/* Tách làm hai chuỗi dịch để phần SỐ bọc riêng trong `numeric` được —
          Be Vietnam Pro không có feature tnum nên tabular-nums trên cả câu
          không có tác dụng, phải đổi hẳn sang font số. Trật tự từ của hai
          chuỗi này giống nhau ở cả tiếng Việt lẫn tiếng Anh. */}
      <p className="text-sm text-ink-muted">
        {t('common.showing', 'Showing')}{' '}
        <span className="numeric">
          {from}–{to}
        </span>{' '}
        {t('common.outOf', 'of')} <span className="numeric">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.previous', 'Previous')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="max-sm:sr-only">{t('common.previous', 'Previous')}</span>
        </Button>

        {/* Dãy số: chỉ desktop. */}
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((pageNumber) => (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === page ? 'page' : undefined}
              className="numeric min-w-9"
            >
              {pageNumber}
            </Button>
          ))}
        </div>

        {/* Mobile: vị trí hiện tại thay cho dãy số. */}
        <span className="numeric px-2 text-sm text-ink-muted sm:hidden">
          {page}/{totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('common.next', 'Next')}
        >
          <span className="max-sm:sr-only">{t('common.next', 'Next')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
