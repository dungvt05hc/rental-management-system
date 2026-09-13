import type { ReactNode } from 'react';
import { cn } from '../../utils';
import { getStatusStyle } from '../../utils/statusStyles';
import { Checkbox } from './Checkbox';
import { Skeleton } from './Skeleton';

export type DataTableMobileRole =
  /** Dòng tiêu đề của thẻ — thường là số phòng hoặc mã hoá đơn. */
  | 'title'
  /** Chip trạng thái, nằm góc trên bên phải thẻ. */
  | 'status'
  /** Con số người dùng thật sự cần: tiền còn phải thu. Hiện to. */
  | 'primary'
  /** Cặp nhãn – giá trị xếp dọc. */
  | 'meta'
  /** Có trong bảng desktop, bỏ khỏi thẻ mobile. */
  | 'hidden';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Bật font số + tabular-nums + canh phải. Dùng cho mọi cột tiền, ngày, chỉ số. */
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Vai trò của cột này khi bảng đổi sang dạng thẻ ở mobile. Mặc định 'meta'. */
  mobile?: DataTableMobileRole;
  headerClassName?: string;
  cellClassName?: string;
  /** Bề ngang cột trên desktop, ví dụ 'w-24'. */
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /**
   * Mô tả bảng cho người dùng trình đọc màn hình. Bắt buộc: "Bảng" trống không
   * nói được gì khi nghe tuần tự.
   */
  caption: string;
  /** Hiện caption ra màn hình. Mặc định chỉ đọc cho screen reader. */
  showCaption?: boolean;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
  /**
   * Trạng thái nghiệp vụ của dòng. Dùng để vẽ dải màu ở mép trái thẻ trên
   * mobile — đọc được khi lướt nhanh mà không cần dừng lại đọc chip.
   */
  rowStatus?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  /** Hành động riêng của từng thẻ trên mobile, ví dụ nút "Thu tiền". */
  mobileActions?: (row: T) => ReactNode;
  selectedKeys?: ReadonlySet<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Nhãn cho ô chọn của một dòng, đọc bởi screen reader. */
  selectionLabel?: (row: T) => string;
  /** Thanh dính dưới bảng khi có dòng được chọn. */
  bulkActions?: ReactNode;
  className?: string;
  /** Giữ dòng tiêu đề dính khi cuộn. Cần bảng nằm trong khung có chiều cao. */
  stickyHeader?: boolean;
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

function columnAlign<T>(column: DataTableColumn<T>) {
  return alignClass[column.align ?? (column.numeric ? 'right' : 'left')];
}

/**
 * Bảng dữ liệu — bảng trên desktop, THẺ trên mobile.
 *
 * Không có phương án "cuộn ngang trên điện thoại". Nhân viên đi thu tiền cầm
 * điện thoại một tay; kéo ngang để nhìn cột tiền rồi kéo ngược lại để biết đó
 * là phòng nào là thao tác hỏng.
 *
 * Thứ tự thông tin giữ nguyên ở cả hai dạng — ai · bao nhiêu · trạng thái ·
 * hạn — nên người quen bảng desktop không phải học lại khi cầm điện thoại.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  showCaption = false,
  isLoading = false,
  skeletonRows = 5,
  emptyState,
  rowStatus,
  onRowClick,
  mobileActions,
  selectedKeys,
  onSelectionChange,
  selectionLabel,
  bulkActions,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  const selectable = Boolean(selectedKeys && onSelectionChange);
  const selected = selectedKeys ?? new Set<string | number>();

  const allKeys = rows.map(rowKey);
  const selectedOnPage = allKeys.filter((key) => selected.has(key));
  const allSelected = rows.length > 0 && selectedOnPage.length === rows.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allKeys));
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  // ─── Đang tải ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-line bg-surface', className)}>
        <p className="sr-only" role="status">
          Đang tải {caption}
        </p>
        <div className="divide-y divide-line">
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Rỗng ─────────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-line bg-surface px-6 py-12 text-center text-sm text-ink-muted',
          className
        )}
      >
        {emptyState ?? 'Chưa có dữ liệu.'}
      </div>
    );
  }

  const titleColumn = columns.find((column) => column.mobile === 'title');
  const statusColumn = columns.find((column) => column.mobile === 'status');
  const primaryColumn = columns.find((column) => column.mobile === 'primary');
  const metaColumns = columns.filter(
    (column) => (column.mobile ?? 'meta') === 'meta' && column !== titleColumn
  );

  return (
    <div className={className}>
      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className={cn('px-3 py-2 text-left text-xs text-ink-muted', !showCaption && 'sr-only')}>
            {caption}
          </caption>
          <thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-surface')}>
            <tr className="border-b border-line">
              {selectable && (
                <th scope="col" className="w-10 px-3">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    // Chữ thường, không VIẾT HOA: tiếng Việt viết hoa có dấu
                    // làm dấu thanh đụng trần chữ hoa, đọc chậm hơn hẳn.
                    'h-11 px-3 text-xs font-semibold whitespace-nowrap text-ink-muted',
                    columnAlign(column),
                    column.width,
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const isSelected = selected.has(key);

              return (
                <tr
                  key={key}
                  data-state={isSelected ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-line last:border-0',
                    isSelected ? 'bg-primary-tint' : 'hover:bg-secondary',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {selectable && (
                    <td className="px-3" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(key)}
                        aria-label={selectionLabel?.(row) ?? `Chọn dòng ${String(key)}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-2.5 align-middle',
                        columnAlign(column),
                        column.numeric && 'numeric',
                        column.cellClassName
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2 sm:hidden">
        <h2 className="sr-only">{caption}</h2>

        {selectable && (
          <label className="flex min-h-touch items-center gap-3 px-1 text-sm text-ink-muted">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={toggleAll}
              aria-label={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            />
            Chọn tất cả
          </label>
        )}

        {rows.map((row) => {
          const key = rowKey(row);
          const isSelected = selected.has(key);
          const status = rowStatus?.(row);
          const statusStyle = status ? getStatusStyle(status) : null;

          return (
            <article
              key={key}
              className={cn(
                'relative overflow-hidden rounded-lg border border-line bg-surface',
                isSelected && 'border-primary bg-primary-tint'
              )}
            >
              {/* Dải màu mép trái: đọc được khi lướt nhanh, không cần dừng lại
                  đọc chữ trong chip. */}
              {statusStyle && (
                <span
                  aria-hidden="true"
                  className={cn('absolute inset-y-0 left-0 w-1', statusStyle.className)}
                />
              )}

              <div className={cn('flex flex-col gap-2 p-3', statusStyle && 'pl-4')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {selectable && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(key)}
                        aria-label={selectionLabel?.(row) ?? `Chọn dòng ${String(key)}`}
                      />
                    )}
                    {titleColumn && (
                      <h3 className="truncate text-base font-semibold text-ink">
                        {titleColumn.cell(row)}
                      </h3>
                    )}
                  </div>
                  {statusColumn && <div className="shrink-0">{statusColumn.cell(row)}</div>}
                </div>

                {primaryColumn && (
                  <div>
                    <span className="block text-xs text-ink-muted">{primaryColumn.header}</span>
                    <span className="numeric block text-2xl font-semibold text-ink">
                      {primaryColumn.cell(row)}
                    </span>
                  </div>
                )}

                {metaColumns.length > 0 && (
                  // Cặp nhãn – giá trị, KHÔNG phải chuỗi nối bằng dấu chấm giữa.
                  // Chuỗi "Phòng 201 · Tầng 2 · 25m²" ép bốn thông tin khác loại
                  // vào một dòng không nhãn, và ở 375px nó xuống dòng ở chỗ
                  // ngẫu nhiên.
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {metaColumns.map((column) => (
                      <div key={column.key} className="min-w-0">
                        <dt className="text-xs text-ink-muted">{column.header}</dt>
                        <dd
                          className={cn(
                            'truncate text-sm text-ink',
                            column.numeric && 'numeric'
                          )}
                        >
                          {column.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {mobileActions && (
                  <div className="flex flex-wrap gap-2 pt-1">{mobileActions(row)}</div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Thanh hành động hàng loạt — dính đáy màn hình trên mobile vì đó là chỗ
          ngón cái với tới được. */}
      {selectable && bulkActions && selectedOnPage.length > 0 && (
        <div
          className={cn(
            'sticky bottom-0 z-20 mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3',
            'shadow-sticky'
          )}
        >
          <span className="text-sm font-medium text-ink" role="status">
            Đã chọn <span className="numeric">{selectedOnPage.length}</span>
          </span>
          <div className="flex flex-wrap gap-2">{bulkActions}</div>
        </div>
      )}
    </div>
  );
}
