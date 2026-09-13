import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface AuthShellProps {
  title: string;
  /** Một câu nói rõ trang này làm gì. Bỏ trống khi tiêu đề đã đủ. */
  subtitle?: string;
  children: ReactNode;
  /** Liên kết phụ dưới thẻ: "Quay lại đăng nhập", "Đã có tài khoản?"… */
  footer?: ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Khung chung cho mọi màn hình ngoài vùng đăng nhập.
 *
 * Sáu trang auth trước đây mỗi trang chép một bản khung riêng — cùng một chuỗi
 * `min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4` và một
 * tiêu đề `text-3xl font-extrabold`. Sáu bản chép là sáu chỗ lệch nhau khi sửa,
 * và thực tế chúng ĐÃ lệch: RegisterPage có subtitle, LoginPage có, ba trang
 * còn lại thì không.
 *
 * `text-3xl font-extrabold` cũng quá nặng cho tiếng Việt: chữ hoa có dấu ở
 * weight 800 làm dấu thanh dính vào nhau. Hạ xuống text-xl/semibold.
 *
 * Nội dung nằm trong <main> chứ không phải <div>: đây là trang đứng một mình,
 * không có Layout bao ngoài, nên nó cần một mốc landmark để trình đọc màn hình
 * nhảy thẳng vào.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-ink-muted">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.welcomeMessage', 'Rental Management System')}
          </p>
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">{children}</div>

        {footer && <div className="mt-4 text-center text-sm text-ink-muted">{footer}</div>}
      </main>
    </div>
  );
}

/**
 * Liên kết trong vùng auth. Gom lại để mọi trang dùng chung một kiểu.
 *
 * Dùng <Link> của react-router chứ không phải <a href>: thẻ a thường làm trình
 * duyệt tải lại toàn bộ ứng dụng, mất luôn trạng thái đang giữ trong bộ nhớ.
 */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="focus-ring rounded-sm font-medium text-primary transition-colors duration-100 hover:text-primary-hover"
    >
      {children}
    </Link>
  );
}
