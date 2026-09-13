import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../utils';

/**
 * Thẻ.
 *
 * KHÔNG đổ bóng, KHÔNG transition hover. Phân tách bằng viền trên nền canvas.
 * Lý do: trên màn điện thoại rẻ ngoài nắng, shadow-sm xám gần như vô hình — nó
 * tốn repaint mà không phân tách được gì. Còn hover đổi màu trên thẻ thì hứa
 * hẹn một hành động mà đa số thẻ không có.
 *
 * Thẻ nào thật sự bấm được thì dùng <CardInteractive>, ở đó hover và focus ring
 * là có thật.
 */
const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border border-line bg-card text-card-foreground', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

/** Thẻ bấm được — ví dụ ô phòng trong sơ đồ, dòng hoá đơn ở dạng thẻ trên mobile. */
const CardInteractive = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'w-full rounded-lg border border-line bg-card text-left text-card-foreground',
        'transition-colors duration-100 hover:border-line-strong hover:bg-secondary',
        'focus-ring',
        className
      )}
      {...props}
    />
  )
);
CardInteractive.displayName = 'CardInteractive';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 p-4 sm:p-5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      // `leading-none tracking-tight` cũ cắt cụt dấu trên chữ hoa tiếng Việt
      // (Ừ, Ế, Ộ): Be Vietnam Pro cần ít nhất 1.265em mới chứa hết dấu.
      className={cn('text-lg font-semibold text-ink', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-ink-muted', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap items-center gap-2 border-t border-line p-4 sm:p-5',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardInteractive,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
