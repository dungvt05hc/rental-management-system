import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Building2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Alert,
  Card,
  EmptyState,
  FilterBar,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import { reportService } from '../../services';
import { formatCurrency, formatPercentage } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';

/* ═══════════════════════════════════════════════════════════════════════════
 * Báo cáo.
 *
 * BA THỨ TRANG TRÍ ĐÃ BỎ. Cả ba đều là nút bấm được nhưng không nối với gì:
 *
 *   - "Export PDF" và "Export Excel": handleExportReport là hàm rỗng, chỉ có
 *     `void format`. Backend CHỈ xuất CSV và chỉ cho customers/rooms/invoices/
 *     payments — không có occupancy/revenue/monthly, nên hai nút này không nối
 *     thật được, dù có muốn.
 *   - Hai nút icon con mắt và máy in ở góc phải: không có onClick nào cả.
 *
 * Nút bấm được mà không làm gì tệ hơn là không có nút: người dùng bấm, không
 * thấy gì xảy ra, rồi nghĩ ứng dụng hỏng.
 *
 * NGƯỢC LẠI, ô "Khoảng thời gian" ĐƯỢC NỐI THẬT. Bản cũ cũng để nó chết: biến
 * `dateRange` được set nhưng không truy vấn nào đọc tới. Hai API dùng ở đây đều
 * đã nhận fromDate/toDate sẵn, nên chỉ cần truyền xuống.
 *
 * PHÉP CHIA CHO 0. Bản cũ tính `paidAmount / totalRevenue` mà không kiểm mẫu
 * số. Khi chưa có doanh thu nào, formatPercentage nhận Infinity — và nó chỉ
 * chặn NaN, nên màn hình in ra đúng chữ "Infinity%".
 * ═══════════════════════════════════════════════════════════════════════════ */

type ReportId = 'occupancy' | 'revenue' | 'monthly';

const REPORTS: Array<{ id: ReportId; key: string; fallback: string; hintKey: string; hint: string; Icon: LucideIcon }> = [
  {
    id: 'occupancy',
    key: 'reports.occupancyReport',
    fallback: 'Occupancy Report',
    hintKey: 'reports.occupancyReportHint',
    hint: 'How full the rooms are and what is still free',
    Icon: Building2,
  },
  {
    id: 'revenue',
    key: 'reports.revenueReport',
    fallback: 'Revenue Report',
    hintKey: 'reports.revenueReportHint',
    hint: 'Money coming in and how much is collected',
    Icon: Wallet,
  },
  {
    id: 'monthly',
    key: 'reports.monthlySummary',
    fallback: 'Monthly Summary',
    hintKey: 'reports.monthlySummaryHint',
    hint: 'How each month went, side by side',
    Icon: BarChart3,
  },
];

type RangeId = 'current' | 'last3' | 'last6' | 'year';

const RANGES: Array<{ id: RangeId; key: string; fallback: string; months: number | 'ytd' }> = [
  { id: 'current', key: 'reports.currentMonth', fallback: 'Current Month', months: 0 },
  { id: 'last3', key: 'reports.last3Months', fallback: 'Last 3 Months', months: 3 },
  { id: 'last6', key: 'reports.last6Months', fallback: 'Last 6 Months', months: 6 },
  { id: 'year', key: 'reports.currentYear', fallback: 'Current Year', months: 'ytd' },
];

/** Ghép ngày theo giờ địa phương. toISOString đổi sang UTC nên ở +07 nó lùi một ngày. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function resolveRange(rangeId: RangeId): { fromDate: string; toDate: string } {
  const now = new Date();
  const spec = RANGES.find((range) => range.id === rangeId);
  const from =
    spec?.months === 'ytd'
      ? new Date(now.getFullYear(), 0, 1)
      : spec?.months === 0
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth() - (spec?.months ?? 0), 1);

  return { fromDate: toIsoDate(from), toDate: toIsoDate(now) };
}

/** Chia an toàn, trả về phần trăm. Mẫu số 0 thì là 0, không phải Infinity. */
function share(part: number, whole: number): number {
  if (!whole) return 0;
  const value = (part / whole) * 100;
  return Number.isFinite(value) ? value : 0;
}

/** Một ô số. Nhãn nhỏ ở trên, số lớn bên dưới, luôn dùng font số. */
function Figure({ label, value, tone }: { label: string; value: string; tone?: 'paid' | 'overdue' }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={`numeric mt-0.5 text-xl font-semibold ${
          tone === 'paid' ? 'text-status-paid' : tone === 'overdue' ? 'text-status-overdue' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Thanh tỉ lệ. Có nhãn đọc được cho trình đọc màn hình, không chỉ là hình. */
function Meter({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="numeric text-sm font-medium text-ink">{formatPercentage(clamped, 0)}</span>
      </div>
      <div
        className="mt-1.5 flex h-2 overflow-hidden rounded-sm bg-secondary"
        role="img"
        aria-label={`${label}: ${formatPercentage(clamped, 0)}`}
      >
        <span className="bg-primary" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<ReportId>('occupancy');
  const [rangeId, setRangeId] = useState<RangeId>('current');

  const range = useMemo(() => resolveRange(rangeId), [rangeId]);

  const occupancyQuery = useQuery({
    // Khoảng thời gian nằm trong queryKey, nếu không React Query trả lại bản
    // đã cache của khoảng cũ và ô chọn trông như vẫn chết.
    queryKey: ['report', 'occupancy', range.fromDate, range.toDate],
    queryFn: () => reportService.getOccupancyReport(range.fromDate, range.toDate),
    enabled: selectedReport === 'occupancy',
  });

  const financialQuery = useQuery({
    queryKey: ['report', 'financial', range.fromDate, range.toDate],
    queryFn: () => reportService.getFinancialSummary(range.fromDate, range.toDate),
    // Bản cũ gọi ĐÚNG API này hai lần với hai queryKey khác nhau ('revenue' và
    // 'monthly'), nên đổi tab là tải lại cùng một dữ liệu.
    enabled: selectedReport === 'revenue' || selectedReport === 'monthly',
  });

  const activeQuery = selectedReport === 'occupancy' ? occupancyQuery : financialQuery;
  const occupancy = occupancyQuery.data?.data;
  const financial = financialQuery.data?.data;

  const renderOccupancy = () => {
    if (!occupancy) return null;
    // Endpoint chỉ trả về số phòng ĐANG CÓ KHÁCH; số phòng trống suy ra từ đó.
    const vacant = Math.max(0, occupancy.totalRooms - occupancy.currentOccupancy);
    const months = occupancy.monthlyOccupancy ?? [];

    return (
      <div className="flex flex-col gap-4">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('reports.occupancyOverview', 'Occupancy Overview')}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Figure label={t('dashboard.totalRooms', 'Total Rooms')} value={String(occupancy.totalRooms)} />
            <Figure label={t('rooms.occupied', 'Occupied')} value={String(occupancy.currentOccupancy)} />
            <Figure label={t('rooms.available', 'Available')} value={String(vacant)} />
            <Figure
              label={t('reports.averageOccupancyRate', 'Average occupancy')}
              value={formatPercentage(occupancy.averageOccupancyRate ?? 0, 0)}
            />
          </dl>

          <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
            <Meter
              label={t('reports.occupancyRate', 'Occupancy Rate')}
              percent={occupancy.currentOccupancyRate ?? 0}
            />
            <Meter
              label={t('reports.availableRooms', 'Available Rooms')}
              percent={share(vacant, occupancy.totalRooms)}
            />
          </div>
        </Card>

        {/* Chuỗi theo tháng vốn CÓ trong response nhưng bản cũ vứt đi — đây mới
            là thứ trả lời được "phòng đang đầy lên hay vơi đi". */}
        {months.length > 0 && (
          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t('reports.occupancyByMonth', 'Occupancy by month')}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {months.map((month) => (
                <li key={month.period}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="numeric text-sm text-ink">{month.period}</span>
                    <span className="text-sm text-ink-muted">
                      <span className="numeric font-medium text-ink">{month.occupiedRooms}</span>
                      <span className="numeric">/{occupancy.totalRooms}</span>
                      {' · '}
                      <span className="numeric">{formatPercentage(month.occupancyRate, 0)}</span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 flex h-2 overflow-hidden rounded-sm bg-secondary"
                    role="img"
                    aria-label={`${month.period}: ${formatPercentage(month.occupancyRate, 0)}`}
                  >
                    <span
                      className="bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, month.occupancyRate))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  };

  const renderRevenue = () => {
    if (!financial?.revenue) return null;
    const revenue = financial.revenue;

    return (
      <div className="flex flex-col gap-4">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('reports.revenueOverview', 'Revenue Overview')}
          </h2>
          {/*
           * Bỏ ô "Quá hạn" của bản cũ: nó luôn hiện 0 ₫ vì nguồn dữ liệu này
           * không có con số đó (trong code cũ ghi thẳng `overdueAmount: 0`).
           * Số quá hạn thật nằm ở trang Tổng quan.
           */}
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Figure
              label={t('dashboard.totalRevenue', 'Total Revenue')}
              value={formatCurrency(revenue.totalRevenue || 0)}
            />
            <Figure
              label={t('reports.totalPayments', 'Total Payments')}
              value={formatCurrency(revenue.totalPayments || 0)}
              tone="paid"
            />
            <Figure
              label={t('reports.outstanding', 'Outstanding')}
              value={formatCurrency(revenue.totalOutstanding || 0)}
              tone="overdue"
            />
          </dl>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('reports.collectionPerformance', 'Collection Performance')}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <Meter
              label={t('dashboard.collectionRate', 'Collection Rate')}
              percent={revenue.collectionRate || 0}
            />
            <dl className="grid grid-cols-2 gap-4">
              <Figure
                label={t('dashboard.collected', 'Collected')}
                value={formatPercentage(share(revenue.totalPayments || 0, revenue.totalRevenue || 0), 0)}
                tone="paid"
              />
              <Figure
                label={t('reports.outstanding', 'Outstanding')}
                value={formatPercentage(
                  share(revenue.totalOutstanding || 0, revenue.totalRevenue || 0),
                  0
                )}
                tone="overdue"
              />
            </dl>
          </div>
        </Card>
      </div>
    );
  };

  const renderMonthly = () => {
    if (!financial) return null;
    // Mọi khối dưới đây đều có thể thiếu: backend dựng object ẩn danh, không có
    // DTO nào bảo đảm. Bản cũ đọc thẳng `deposits.totalSecurityDeposits` nên
    // thiếu một khối là cả trang trắng.
    const revenue = financial.revenue;
    const deposits = financial.deposits;
    const summary = financial.summary;
    const breakdown = financial.monthlyBreakdown ?? [];

    return (
      <div className="flex flex-col gap-4">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('reports.revenueSummary', 'Revenue Summary')}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Figure
              label={t('dashboard.totalRevenue', 'Total Revenue')}
              value={formatCurrency(revenue?.totalRevenue || 0)}
            />
            <Figure
              label={t('reports.averageMonthlyRevenue', 'Average Monthly Revenue')}
              value={formatCurrency(summary?.averageMonthlyRevenue || 0)}
            />
            <Figure
              label={t('reports.totalSecurityDeposits', 'Total Security Deposits')}
              value={formatCurrency(deposits?.totalSecurityDeposits || 0)}
            />
            <Figure
              label={t('reports.totalInvoices', 'Total Invoices')}
              value={String(summary?.totalInvoices || 0)}
            />
          </dl>
        </Card>

        {breakdown.length > 0 ? (
          <Card className="overflow-hidden">
            <h2 className="border-b border-line p-4 text-lg font-semibold text-ink sm:p-5">
              {t('reports.monthlyBreakdown', 'Monthly Breakdown')}
            </h2>

            {/* Desktop: bảng. */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  {t('reports.monthlyBreakdown', 'Monthly Breakdown')}
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="h-11 px-3 text-left text-xs font-semibold text-ink-muted">
                      {t('reports.period', 'Period')}
                    </th>
                    <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                      {t('reports.totalInvoiced', 'Total Invoiced')}
                    </th>
                    <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                      {t('invoices.paidAmount', 'Paid Amount')}
                    </th>
                    <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                      {t('reports.outstanding', 'Outstanding')}
                    </th>
                    <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                      {t('dashboard.collectionRate', 'Collection Rate')}
                    </th>
                    <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                      {t('invoices.title', 'Invoices')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((month, index) => (
                    <tr key={index} className="border-b border-line last:border-0">
                      <td className="numeric px-3 py-2.5 font-medium text-ink">
                        {month.period || `${month.year}-${String(month.month).padStart(2, '0')}`}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right">
                        {formatCurrency(month.totalInvoiced || 0)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right text-status-paid">
                        {formatCurrency(month.paidAmount || 0)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right">
                        {formatCurrency(month.outstandingAmount || 0)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right">
                        {formatPercentage(month.collectionRate || 0, 0)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right">{month.invoiceCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: thẻ. Sáu cột tiền không cuộn ngang được bằng ngón cái. */}
            <ul className="flex flex-col divide-y divide-line sm:hidden">
              {breakdown.map((month, index) => (
                <li key={index} className="flex flex-col gap-2 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="numeric font-semibold text-ink">
                      {month.period || `${month.year}-${String(month.month).padStart(2, '0')}`}
                    </span>
                    <span className="numeric text-sm text-ink-muted">
                      {formatPercentage(month.collectionRate || 0, 0)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('reports.totalInvoiced', 'Total Invoiced')}
                      </dt>
                      <dd className="numeric text-sm text-ink">
                        {formatCurrency(month.totalInvoiced || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('invoices.paidAmount', 'Paid Amount')}
                      </dt>
                      <dd className="numeric text-sm text-status-paid">
                        {formatCurrency(month.paidAmount || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('reports.outstanding', 'Outstanding')}
                      </dt>
                      <dd className="numeric text-sm text-ink">
                        {formatCurrency(month.outstandingAmount || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">{t('invoices.title', 'Invoices')}</dt>
                      <dd className="numeric text-sm text-ink">{month.invoiceCount || 0}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title={t('reports.noDataTitle', 'No data in this period')}
            description={t(
              'reports.noDataBody',
              'No invoice falls inside the selected range. Widen the date range to see more.'
            )}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('reports.title', 'Reports')}
        description={t('reports.subtitle', 'Build and read detailed business reports')}
      />

      <FilterBar>
        {/* Chọn báo cáo bằng nút phân đoạn: chỉ ba lựa chọn, và người dùng đổi
            qua đổi lại liên tục — đưa vào dropdown là thêm một cú bấm mỗi lần. */}
        <div
          role="tablist"
          aria-label={t('reports.selectReportType', 'Choose a report')}
          className="flex flex-wrap gap-2 sm:flex-1"
        >
          {REPORTS.map(({ id, key, fallback, Icon }) => {
            const isSelected = selectedReport === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedReport(id)}
                className={`focus-ring inline-flex min-h-touch items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-100 sm:min-h-10 ${
                  isSelected
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-input bg-surface text-ink hover:bg-secondary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t(key, fallback)}
              </button>
            );
          })}
        </div>

        <Select value={rangeId} onValueChange={(value) => setRangeId(value as RangeId)}>
          <SelectTrigger className="sm:w-52" aria-label={t('reports.dateRange', 'Date range')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {t(option.key, option.fallback)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <p className="-mt-1 text-sm text-ink-muted">
        {REPORTS.find((report) => report.id === selectedReport)?.hintKey
          ? t(
              REPORTS.find((report) => report.id === selectedReport)!.hintKey,
              REPORTS.find((report) => report.id === selectedReport)!.hint
            )
          : null}
      </p>

      {activeQuery.isError ? (
        <Alert variant="error" title={t('reports.loadError', 'Could not load the report')}>
          {t('common.unexpectedError', 'An error occurred')}
        </Alert>
      ) : activeQuery.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {selectedReport === 'occupancy' && renderOccupancy()}
          {selectedReport === 'revenue' && renderRevenue()}
          {selectedReport === 'monthly' && renderMonthly()}
        </>
      )}
    </div>
  );
}
