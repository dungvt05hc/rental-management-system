import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils';

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

/**
 * Chú thích khi rê chuột hoặc khi phần tử bên trong nhận tiêu điểm.
 *
 * Bọc quanh một phần tử VỐN ĐÃ bấm/focus được (nút, link). Không tự đặt
 * tabIndex lên lớp bọc: bản cũ gắn role="button" + tabIndex={0} cho một thẻ div
 * không phải nút, khiến mỗi chú thích chèn thêm một "nút" rỗng vào thứ tự Tab
 * và trình đọc màn hình đọc là "nút, trống".
 *
 * Vì focus/blur trong React nổi bọt (focusin/focusout), lớp bọc vẫn bắt được
 * tiêu điểm của phần tử con mà không cần tự làm mình focus được.
 *
 * Chú thích KHÔNG được là nơi duy nhất chứa thông tin cần thiết — trên điện
 * thoại không có chuột để rê.
 */
export function Tooltip({ children, content, position = 'top', className, delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - gap;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + gap;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollX + gap;
        break;
    }

    // Giữ trong khung nhìn — ở 375px thì chú thích đặt "top" rất dễ tràn mép.
    if (left < scrollX + gap) left = scrollX + gap;
    if (left + tooltipRect.width > scrollX + window.innerWidth - gap) {
      left = scrollX + window.innerWidth - tooltipRect.width - gap;
    }
    if (top < scrollY + gap) top = scrollY + gap;
    if (top + tooltipRect.height > scrollY + window.innerHeight - gap) {
      top = scrollY + window.innerHeight - tooltipRect.height - gap;
    }

    setCoords({ top, left });
  }, [position]);

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    // Escape đóng chú thích mà không làm mất tiêu điểm khỏi nút bên dưới —
    // WCAG 1.4.13 (nội dung hiện ra khi hover/focus phải đóng được).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsVisible(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const arrowClass = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-ink border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-ink border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-ink border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-ink border-t-transparent border-b-transparent border-l-transparent',
  }[position];

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={cn('inline-flex', className)}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </span>

      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 60 }}
        >
          <div className="relative max-w-xs rounded-md bg-ink px-3 py-2 text-xs text-white shadow-overlay sm:max-w-sm">
            {content}
            <div className={cn('absolute h-0 w-0 border-[6px]', arrowClass)} />
          </div>
        </div>
      )}
    </>
  );
}

/** Giữ cho tương thích API. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex', className)}>{children}</span>;
}

export function TooltipContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'max-w-xs rounded-md bg-ink px-3 py-2 text-xs text-white shadow-overlay sm:max-w-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
