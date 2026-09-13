import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  FileSignature,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Alert, Badge, Button, Card, Skeleton } from '../ui';
import { reportService, roomService } from '../../services';
import { formatCurrency, formatDate, formatPercentage } from '../../utils';
import type {
  OverdueInvoiceRow,
  RevenueReport,
  Room,
  UpcomingInvoiceRow,
} from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

/* ═══════════════════════════════════════════════════════════════════════════
 * Tổng quan.
 *
 * Màn hình này trả lời ĐÚNG HAI CÂU, theo thứ tự đó:
 *
 *   1. Hôm nay phải đi đòi ai, bao nhiêu tiền?
 *   2. Phòng nào đang trống, mỗi tháng mất bao nhiêu vì nó trống?
 *
 * Mọi thứ còn lại là phần phụ và nằm dưới. Bản cũ mở đầu bằng bốn thẻ số liệu
 * cùng cỡ chữ, cùng cách bố trí, mỗi thẻ một icon tròn màu khác nhau — bố cục
 * đó không xếp hạng gì cả, người đọc phải tự đọc hết bốn thẻ rồi tự quyết định
 * thẻ nào quan trọng. Ở đây con số quá hạn là thứ duy nhất được cỡ chữ lớn
 * nhất và màu đỏ trạng thái, và ngay dưới nó là TÊN NGƯỜI — vì "12.400.000 ₫
 * quá hạn" không làm được gì, còn "Nguyễn Văn Bảo, 2.500.000 ₫, trễ 23 ngày"
 * thì gọi điện được ngay.
 *
 * Nút xanh "Ghi nhận thu tiền" là phần tử tô đặc màu primary DUY NHẤT trên
 * trang. Primary khác họ màu với toàn bộ bảng màu trạng thái (xem index.css),
 * nên nó không tranh chấp thị giác với con số đỏ: một bên là câu trả lời, một
 * bên là việc phải làm.
 *
 * Số tiền dùng class `numeric` (Inter + tabular-nums) để hàng nghìn thẳng cột
 * khi dò từ trên xuống.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Tự tải lại sau 5 phút — giữ nguyên nhịp của bản cũ. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Cửa sổ "sắp đến hạn". Đủ dài để chuẩn bị, đủ ngắn để không loãng. */
const SOON_WINDOW_DAYS = 7;

/** Số dòng quá hạn hiện thẳng trên trang. Còn lại xem ở màn hình hoá đơn. */
const OVERDUE_PREVIEW = 6;

/** Số phòng trống liệt kê tên. Còn lại gộp thành "và N phòng nữa". */
const VACANT_PREVIEW = 5;

/** Quá mốc này thì chip đổi từ hổ phách sang đỏ. Một tháng = một kỳ tiền phòng. */
const SEVERE_DAYS_OVERDUE = 30;

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

/**
 * View-model của trang. Đây là thứ dựng TỪ dữ liệu API, không phải shape của
 * API — các DTO ở types/index.ts không đổi.
 */
interface DashboardView {
  overdue: {
    amount: number;
    count: number;
    customers: number;
    maxDaysLate: number;
    rows: OverdueInvoiceRow[];
  };
  soon: { count: number; amount: number };
  rooms: {
    vacant: Room[];
    vacantCount: number;
    total: number;
    idleRent: number;
    occupancyRate: number;
  };
  period: { collected: number; pending: number; collectionRate: number };
  contractsExpiring: number;
}

const EMPTY_VIEW: DashboardView = {
  overdue: { amount: 0, count: 0, customers: 0, maxDaysLate: 0, rows: [] },
  soon: { count: 0, amount: 0 },
  rooms: { vacant: [], vacantCount: 0, total: 0, idleRent: 0, occupancyRate: 0 },
  period: { collected: 0, pending: 0, collectionRate: 0 },
  contractsExpiring: 0,
};

/** Trễ càng lâu chip càng đậm. Dưới một kỳ tiền phòng thì còn là hổ phách. */
function lateness(days: number): string {
  return days > SEVERE_DAYS_OVERDUE ? 'overdue' : 'unpaid';
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [view, setView] = useState<DashboardView>(EMPTY_VIEW);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  /*
   * Cảnh báo sinh từ ngưỡng — giữ nguyên các mốc của bản cũ, chỉ đổi chỗ hiển
   * thị: chúng xuống cuối trang thay vì chắn trước câu trả lời.
   *
   * Tỉ lệ lấp đầy nay nhận vào dạng SỐ, không nhận cả OccupancyReport nữa: báo
   * cáo occupancy-rate không hề có trường `occupancyRate` (xem chú thích ở
   * types/index.ts), nên mọi so sánh ở đây trước kia đều là `undefined < 70`,
   * tức là false — hai cảnh báo về lấp đầy CHƯA BAO GIỜ chạy.
   */
  const generateSystemAlerts = useCallback(
    (occupancyRate: number, revenue: RevenueReport) => {
      const newAlerts: SystemAlert[] = [];

      if (occupancyRate < 70) {
        newAlerts.push({
          id: 'low-occupancy',
          type: 'warning',
          title: t('dashboard.lowOccupancy', 'Low Occupancy Rate'),
          message: t(
            'dashboard.lowOccupancyMessage',
            'Current occupancy rate is {rate}. Consider marketing strategies.',
            { rate: formatPercentage(occupancyRate) }
          ),
          timestamp: new Date(),
        });
      }

      if (revenue.overdueAmount > revenue.totalRevenue * 0.1) {
        newAlerts.push({
          id: 'high-overdue',
          type: 'error',
          title: t('dashboard.highOverdue', 'High Overdue Amount'),
          message: t(
            'dashboard.overdueRequiresAttention',
            '{amount} in overdue payments requires immediate attention.',
            { amount: formatCurrency(revenue.overdueAmount) }
          ),
          timestamp: new Date(),
        });
      }

      if (revenue.collectionRate > 90) {
        newAlerts.push({
          id: 'good-collection',
          type: 'success',
          title: t('dashboard.excellentCollection', 'Excellent Collection Rate'),
          message: t(
            'dashboard.excellentCollectionMessage',
            'Current collection rate is {rate}. Keep up the good work!',
            { rate: formatPercentage(revenue.collectionRate) }
          ),
          timestamp: new Date(),
        });
      }

      if (occupancyRate > 95) {
        newAlerts.push({
          id: 'high-occupancy',
          type: 'info',
          title: t('dashboard.highOccupancyTitle', 'High Occupancy Rate'),
          message: t(
            'dashboard.highOccupancyMessage',
            'Occupancy rate is {rate}. Consider expanding capacity.',
            { rate: formatPercentage(occupancyRate) }
          ),
          timestamp: new Date(),
        });
      }

      setAlerts(newAlerts);
    },
    [t]
  );

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      /*
       * BỎ lệnh gọi /reports/occupancy-rate.
       *
       * Bản trước gọi nó để lấy occupiedRooms / availableRooms / occupancyRate,
       * nhưng endpoint đó KHÔNG trả về ba trường ấy — chúng chỉ tồn tại trong
       * khai báo type sai ở frontend (đã sửa, xem types/index.ts). Trên thực tế
       * mọi giá trị đều undefined và rơi xuống nhánh dự phòng lấy từ
       * /reports/dashboard-summary. Nay lấy thẳng từ nguồn đúng, bớt một lượt
       * mạng và bớt một nhánh dự phòng giả.
       */
      const [dashboardResponse, outstandingResponse, vacantResponse] = await Promise.all([
        reportService.getDashboardSummary(),
        reportService.getOutstandingPaymentsReport(),
        roomService.getAvailableRooms(),
      ]);

      if (!dashboardResponse.success) {
        throw new Error(dashboardResponse.message || 'Failed to load dashboard data');
      }

      const dashboard = dashboardResponse.data;
      const financials = dashboard?.financials;
      const occupancyData = dashboard?.occupancy;

      const monthlyRevenue = financials?.monthlyRevenue || 0;
      const pendingPayments = financials?.pendingPayments || 0;
      const collectionRate =
        monthlyRevenue + pendingPayments > 0
          ? Math.round((monthlyRevenue / (monthlyRevenue + pendingPayments)) * 100)
          : 0;

      /*
       * Báo cáo công nợ và danh sách phòng trống KHÔNG chặn trang: mất chúng thì
       * hai khối tương ứng rơi về trạng thái rỗng, phần còn lại vẫn đọc được.
       */
      const outstanding = outstandingResponse.success ? outstandingResponse.data : undefined;

      const overdueRows: OverdueInvoiceRow[] = [...(outstanding?.overdueInvoices ?? [])].sort(
        (a, b) => b.daysOverdue - a.daysOverdue
      );
      const overdueAmount = overdueRows.reduce((sum, row) => sum + row.amount, 0);
      const upcoming: UpcomingInvoiceRow[] = (outstanding?.upcomingInvoices ?? []).filter(
        (row) => row.daysUntilDue <= SOON_WINDOW_DAYS
      );

      const hasVacantList = vacantResponse.success && Array.isArray(vacantResponse.data);
      const vacantRooms: Room[] = hasVacantList ? vacantResponse.data! : [];

      const totalRooms = occupancyData?.totalRooms || 0;
      const occupancyRate = occupancyData?.occupancyRate || 0;

      setView({
        overdue: {
          // Tổng từ chính các dòng đang hiện, không lấy con số tổng ở nơi khác:
          // hai số lệch nhau trên cùng một màn hình là thứ người dùng phát hiện
          // ngay và không tin lại được nữa.
          amount: overdueAmount,
          count: overdueRows.length,
          customers: new Set(overdueRows.map((row) => row.customerName)).size,
          maxDaysLate: overdueRows.length > 0 ? overdueRows[0].daysOverdue : 0,
          rows: overdueRows,
        },
        soon: {
          count: upcoming.length,
          amount: upcoming.reduce((sum, row) => sum + row.amount, 0),
        },
        rooms: {
          vacant: vacantRooms,
          // Danh sách phòng trống lấy được thì ĐẾM CHÍNH NÓ, kể cả khi bằng 0.
          // Lấy con số từ báo cáo lấp đầy trong lúc danh sách rỗng sẽ ra thẻ
          // "5 phòng trống" mà không có phòng nào bên dưới — hai con số đá nhau
          // trên cùng một thẻ. Số của báo cáo chỉ dùng khi gọi danh sách hỏng.
          vacantCount: hasVacantList
            ? vacantRooms.length
            : occupancyData?.vacantRooms || 0,
          total: totalRooms,
          // Tiền thuê của phòng đang trống — mỗi tháng phòng trống là mất đúng
          // chừng này. Đây là con số làm người ta đi tìm khách, "3 phòng trống"
          // thì không.
          idleRent: vacantRooms.reduce((sum, room) => sum + (room.monthlyRent || 0), 0),
          occupancyRate,
        },
        period: {
          collected: monthlyRevenue,
          pending: pendingPayments,
          collectionRate,
        },
        contractsExpiring: dashboard?.upcomingEvents?.contractsExpiring || 0,
      });

      if (dashboard) {
        generateSystemAlerts(occupancyRate, {
          totalRevenue: monthlyRevenue,
          paidAmount: monthlyRevenue,
          pendingAmount: pendingPayments,
          // `financials.overdueInvoices` là SỐ LƯỢNG hoá đơn quá hạn, không phải
          // số tiền — backend dựng nó bằng CountAsync (ReportingService.cs:548).
          // Bản cũ đưa thẳng con số đó vào chỗ tiền nên cảnh báo hiện ra
          // "Còn 9 ₫ tiền quá hạn chưa thu". Ngưỡng cảnh báo giữ nguyên, chỉ
          // thay bằng số tiền thật cộng từ báo cáo công nợ.
          overdueAmount,
          collectionRate,
        } as RevenueReport);
      }

      setHasData(true);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [generateSystemAlerts]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const dismissAlert = (alertId: string) =>
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));

  const todayLabel = useMemo(
    () => formatDate(new Date(), { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink">{t('dashboard.title', 'Dashboard')}</h1>
        {/* Ngày hôm nay, không phải câu chào. Câu chào không giúp ai quyết định gì. */}
        <p className="mt-0.5 text-sm text-ink-muted first-letter:uppercase">{todayLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-xs text-ink-muted">
          {t('dashboard.lastUpdated', 'Last updated')}{' '}
          <span className="numeric">
            {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadDashboardData}
          disabled={isLoading}
          aria-label={t('common.refresh', 'Refresh')}
        >
          {/* Xoay là phản hồi cho cú bấm của người dùng — được miễn trừ
              prefers-reduced-motion vì đóng băng nó lại thì nhìn như app treo. */}
          <RefreshCw
            data-allow-motion={isLoading ? '' : undefined}
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );

  if (!hasData && isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        {header}
        <p className="sr-only" role="status">
          {t('common.loading', 'Loading...')}
        </p>
        {/* Khối chờ vẽ đúng bố cục sắp hiện ra, để trang không nhảy khi dữ liệu về. */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-line border-l-4 border-l-line bg-surface p-4 sm:p-5 lg:col-span-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-9 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
            <div className="mt-5 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="p-4 sm:p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-9 w-28" />
              <Skeleton className="mt-3 h-4 w-full" />
            </Card>
            <Card className="p-4 sm:p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-6 w-40" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const { overdue, soon, rooms, period } = view;
  const hiddenOverdue = overdue.count - Math.min(overdue.count, OVERDUE_PREVIEW);
  const hiddenRooms = rooms.vacant.length - Math.min(rooms.vacant.length, VACANT_PREVIEW);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {header}

      {error && (
        <Alert variant="error" title={t('dashboard.loadError', 'Could not load dashboard data')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadDashboardData}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* ══ CÂU TRẢ LỜI 1 — hôm nay phải đòi ai ═════════════════════════════
            Dải đỏ mép trái: nhận ra khối này trước cả khi đọc chữ. Khi không
            còn nợ quá hạn, dải đổi sang xanh "đã xong" — thay đổi ở mép trái
            đọc được từ xa hơn là đọc lại câu tiêu đề. */}
        <section
          className={`overflow-hidden rounded-lg border border-line border-l-4 bg-surface lg:col-span-2 ${
            overdue.count > 0 ? 'border-l-status-overdue' : 'border-l-status-paid'
          }`}
          aria-labelledby="dashboard-overdue-heading"
        >
          <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2
                id="dashboard-overdue-heading"
                className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
              >
                {overdue.count > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-status-overdue" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-status-paid" aria-hidden="true" />
                )}
                {t('dashboard.toCollectToday', 'To collect today')}
              </h2>

              {overdue.count > 0 ? (
                <>
                  <p className="numeric mt-1 text-3xl font-semibold text-status-overdue">
                    {formatCurrency(overdue.amount)}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t(
                      'dashboard.overdueSummary',
                      '{invoices} invoices · {customers} customers · up to {days} days late',
                      {
                        invoices: overdue.count,
                        customers: overdue.customers,
                        days: overdue.maxDaysLate,
                      }
                    )}
                  </p>
                </>
              ) : (
                // Trạng thái rỗng nói ra kết luận, không phải "Không có dữ liệu".
                <>
                  <p className="mt-1 text-2xl font-semibold text-ink">
                    {t('dashboard.noOverdueTitle', 'Nobody is overdue')}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t(
                      'dashboard.noOverdueBody',
                      'Every invoice that has come due has been collected.'
                    )}
                  </p>
                </>
              )}
            </div>

            {/* Việc chính của màn hình này. Phần tử tô đặc primary duy nhất trên trang. */}
            <Button
              size="lg"
              className="max-sm:w-full"
              onClick={() => navigate('/payments/new')}
              leadingIcon={<Wallet className="h-4 w-4" aria-hidden="true" />}
            >
              {t('payments.recordPayment', 'Record Payment')}
            </Button>
          </div>

          {overdue.count > 0 && (
            <>
              <ul className="flex flex-col border-t border-line">
                {overdue.rows.slice(0, OVERDUE_PREVIEW).map((row) => (
                  <li key={row.invoiceId} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/invoices/${row.invoiceId}`)}
                      className="focus-ring flex min-h-touch w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-secondary sm:px-5"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium text-ink">
                          {row.customerName}
                        </span>
                        <span className="numeric shrink-0 text-base font-semibold text-ink">
                          {formatCurrency(row.amount)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge status={lateness(row.daysOverdue)} size="sm">
                          {t('dashboard.daysLate', '{days} days late', { days: row.daysOverdue })}
                        </Badge>
                        <span className="truncate text-xs text-ink-muted">
                          {t('dashboard.dueOn', 'due {date}', { date: formatDate(row.dueDate) })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line px-4 py-2 sm:px-5">
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-md text-sm font-medium text-primary transition-colors duration-100 hover:text-primary-hover sm:min-h-0 sm:py-1.5"
                >
                  {hiddenOverdue > 0
                    ? t('dashboard.viewAllOverdue', 'View all {count} overdue invoices', {
                        count: overdue.count,
                      })
                    : t('dashboard.viewInvoices', 'Open invoices')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {/* ══ CÂU TRẢ LỜI 2 — phòng nào trống ══════════════════════════════ */}
          <Card className="p-4 sm:p-5" aria-labelledby="dashboard-vacant-heading">
            <h2
              id="dashboard-vacant-heading"
              className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
            >
              <DoorOpen className="h-4 w-4" aria-hidden="true" />
              {t('dashboard.vacantRooms', 'Vacant rooms')}
            </h2>

            {rooms.vacantCount > 0 ? (
              <>
                <p className="mt-1">
                  <span className="numeric text-3xl font-semibold text-ink">
                    {rooms.vacantCount}
                  </span>
                  <span className="numeric ml-1 text-lg text-ink-muted">/{rooms.total}</span>
                </p>
                {rooms.idleRent > 0 && (
                  // Con số này mới là thứ làm người ta đi tìm khách.
                  <p className="mt-1 text-sm text-ink-muted">
                    {t('dashboard.idleRent', '{amount} of rent not earning each month', {
                      amount: formatCurrency(rooms.idleRent),
                    })}
                  </p>
                )}

                {rooms.vacant.length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
                    {rooms.vacant.slice(0, VACANT_PREVIEW).map((room) => (
                      <li
                        key={room.id}
                        className="flex items-baseline justify-between gap-3 py-1.5"
                      >
                        <span className="min-w-0 truncate text-sm text-ink">
                          <span className="font-medium">
                            {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })}
                          </span>
                          <span className="ml-1.5 text-xs text-ink-muted">
                            {t('rooms.floorLabel', 'Floor {number}', { number: room.floor })}
                          </span>
                        </span>
                        <span className="numeric shrink-0 text-sm text-ink-muted">
                          {formatCurrency(room.monthlyRent)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {hiddenRooms > 0 && (
                  <p className="mt-1.5 text-xs text-ink-muted">
                    {t('dashboard.moreRooms', 'and {count} more', { count: hiddenRooms })}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/rooms')}
                  className="focus-ring mt-2 inline-flex min-h-touch items-center gap-1.5 rounded-md text-sm font-medium text-primary transition-colors duration-100 hover:text-primary-hover sm:min-h-0 sm:py-1.5"
                >
                  {t('dashboard.viewRooms', 'View rooms')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <p className="mt-1 text-base text-ink">
                {t('dashboard.allRoomsOccupied', 'Full house — all {count} rooms are occupied.', {
                  count: rooms.total,
                })}
              </p>
            )}
          </Card>

          {/* ══ Chuẩn bị cho mấy ngày tới ════════════════════════════════════ */}
          <Card className="p-4 sm:p-5" aria-labelledby="dashboard-soon-heading">
            <h2
              id="dashboard-soon-heading"
              className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {t('dashboard.dueSoon', 'Due soon')}
            </h2>
            {soon.count > 0 ? (
              <>
                <p className="numeric mt-1 text-2xl font-semibold text-ink">
                  {formatCurrency(soon.amount)}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {t('dashboard.dueSoonBody', '{count} invoices due in the next {days} days', {
                    count: soon.count,
                    days: SOON_WINDOW_DAYS,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                {t('dashboard.dueSoonNone', 'No invoices fall due in the next {days} days.', {
                  days: SOON_WINDOW_DAYS,
                })}
              </p>
            )}

            {view.contractsExpiring > 0 && (
              <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-sm text-ink-muted">
                <FileSignature className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('dashboard.contractsExpiring', '{count} contracts expiring soon', {
                  count: view.contractsExpiring,
                })}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* ══ Nền: kỳ này thu được đến đâu ══════════════════════════════════════
          Một thanh duy nhất thay cho hai thẻ biểu đồ đối xứng. Đây là bối cảnh,
          không phải việc phải làm, nên nó nằm cuối và không dùng cỡ chữ lớn. */}
      <Card className="p-4 sm:p-5" aria-labelledby="dashboard-period-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="dashboard-period-heading" className="text-sm font-semibold text-ink-muted">
            {t('dashboard.thisPeriod', 'Collection this period')}
          </h2>
          <p className="text-sm text-ink-muted">
            {t('rooms.occupied', 'Occupied')}{' '}
            <span className="numeric font-medium text-ink">
              {formatPercentage(rooms.occupancyRate, 0)}
            </span>
          </p>
        </div>

        <div
          className="mt-3 flex h-2 overflow-hidden rounded-sm bg-secondary"
          role="img"
          aria-label={t('dashboard.collectionRateTrend', '{rate} collection rate', {
            rate: formatPercentage(period.collectionRate, 0),
          })}
        >
          <span
            className="bg-status-paid"
            style={{ width: `${Math.min(100, Math.max(0, period.collectionRate))}%` }}
          />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-muted">{t('dashboard.collected', 'Collected')}</dt>
            <dd className="numeric text-base font-semibold text-status-paid">
              {formatCurrency(period.collected)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">
              {t('dashboard.stillToCollect', 'Still to collect')}
            </dt>
            <dd className="numeric text-base font-semibold text-ink">
              {formatCurrency(period.pending)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">
              {t('dashboard.collectionRate', 'Collection Rate')}
            </dt>
            <dd className="numeric text-base font-semibold text-ink">
              {formatPercentage(period.collectionRate, 0)}
            </dd>
          </div>
        </dl>
      </Card>

      {/* ══ Cảnh báo theo ngưỡng ══════════════════════════════════════════════
          Xuống cuối trang: đây là nhận xét về xu hướng, không phải việc hôm nay
          phải làm. Bản cũ đặt chúng TRƯỚC mọi số liệu nên chúng đẩy câu trả lời
          xuống dưới màn hình đầu tiên. */}
      {alerts.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="dashboard-alerts-heading">
          <h2 id="dashboard-alerts-heading" className="text-sm font-semibold text-ink-muted">
            {t('dashboard.systemAlerts', 'System Alerts')}{' '}
            <span className="numeric">({alerts.length})</span>
          </h2>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.type}
              title={alert.title}
              onClose={() => dismissAlert(alert.id)}
            >
              {alert.message}
            </Alert>
          ))}
        </section>
      )}
    </div>
  );
}
