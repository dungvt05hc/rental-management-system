import { Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  NumericInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';
import type { InvoiceItem, Item } from '../../types';
import { formatCurrency } from '../../utils';
import { useTranslation } from '../../hooks/useTranslation';
import type { InvoiceTotals } from './useInvoiceForm';

/* ═══════════════════════════════════════════════════════════════════════════
 * Bảng nhập các dòng của hoá đơn.
 *
 * Component này KHÔNG tính tiền. Mọi phép cộng nằm ở useInvoiceForm; ở đây chỉ
 * có ô nhập và cách bày. Đó là lý do nó xuống còn chừng này dòng: bản cũ 694
 * dòng vì nó vừa dựng giao diện vừa tự cộng lại tổng, lại còn không được màn
 * hình nào import — form tự chép một bản thứ hai của cùng cái bảng này.
 *
 * DESKTOP: bảng. Người lập hoá đơn nhập theo cột, mắt chạy dọc cột đơn giá.
 * MOBILE : mỗi dòng là một thẻ. Bảng mười một cột trên điện thoại chỉ có hai
 *          lối thoát — cuộn ngang, hoặc bóp ô nhập xuống 30px. Cả hai đều hỏng
 *          khi thứ đang gõ là tiền.
 *
 * Đơn vị tính dùng <datalist>: gợi ý sẵn nhưng vẫn gõ tự do được. Ép thành
 * <select> là chặn mất những đơn vị thật mà danh sách chưa lường tới.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Gợi ý đơn vị tính. Không phải danh sách đóng — ô vẫn gõ tự do. */
const UNIT_SUGGESTIONS = [
  'pcs',
  'kg',
  'm',
  'm²',
  'kWh',
  'm³',
  'giờ',
  'ngày',
  'tháng',
  'bộ',
  'thùng',
];

const UNIT_LIST_ID = 'invoice-item-units';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  /** Danh mục khoản mục để chọn nhanh. */
  catalog: Item[];
  totals: InvoiceTotals;
  disabled?: boolean;
  onAdd: () => void;
  onUpdate: <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => void;
  onSelectCatalogItem: (index: number, catalogItem: Item) => void;
  onRemove: (index: number, itemName: string) => void;
}

export function InvoiceItemsTable({
  items,
  catalog,
  totals,
  disabled = false,
  onAdd,
  onUpdate,
  onSelectCatalogItem,
  onRemove,
}: InvoiceItemsTableProps) {
  const { t } = useTranslation();

  const catalogValueOf = (item: InvoiceItem): string => {
    const match = catalog.find((entry) => entry.itemCode === item.itemCode);
    return match ? String(match.id) : '';
  };

  const handleCatalogChange = (index: number, value: string) => {
    const selected = catalog.find((entry) => String(entry.id) === value);
    if (selected) onSelectCatalogItem(index, selected);
  };

  const addButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAdd}
      disabled={disabled}
      leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
    >
      {t('invoices.addItem', 'Add Item')}
    </Button>
  );

  return (
    <section className="rounded-lg border border-line bg-surface" aria-labelledby="invoice-items-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <h2 id="invoice-items-heading" className="text-lg font-semibold text-ink">
            {t('invoices.lineItems', 'Invoice Line Items')}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {items.length > 0
              ? t('invoices.itemCount', '{count} items', { count: items.length })
              : t('invoices.noItemsHint', 'Use the Add Item button to put lines on this invoice')}
          </p>
        </div>
        {addButton}
      </div>

      <datalist id={UNIT_LIST_ID}>
        {UNIT_SUGGESTIONS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-muted sm:px-5">
          {t('invoices.noItemsYet', 'No line items yet')}
        </p>
      ) : (
        <>
          {/* ══ DESKTOP ═════════════════════════════════════════════════════ */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('invoices.lineItems', 'Invoice Line Items')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="h-11 w-10 px-3 text-left text-xs font-semibold text-ink-muted">
                    #
                  </th>
                  <th scope="col" className="h-11 px-3 text-left text-xs font-semibold text-ink-muted">
                    {t('items.itemName', 'Item Name')}
                  </th>
                  <th scope="col" className="h-11 w-24 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.quantityShort', 'Qty')}
                  </th>
                  <th scope="col" className="h-11 w-24 px-3 text-left text-xs font-semibold text-ink-muted">
                    {t('invoices.unitShort', 'Unit')}
                  </th>
                  <th scope="col" className="h-11 w-40 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('items.unitPrice', 'Unit Price')}
                  </th>
                  <th scope="col" className="h-11 w-24 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.discountPercentShort', 'Disc %')}
                  </th>
                  <th scope="col" className="h-11 w-24 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('items.taxPercent', 'Tax %')}
                  </th>
                  <th scope="col" className="h-11 w-36 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.lineTotal', 'Line Total')}
                  </th>
                  <th scope="col" className="h-11 w-12 px-3">
                    <span className="sr-only">{t('common.actions', 'Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-line last:border-0 align-top">
                    <td className="numeric px-3 py-3 text-sm text-ink-muted">{item.lineNumber}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Select
                          value={catalogValueOf(item)}
                          onValueChange={(value) => handleCatalogChange(index, value)}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            className="h-9 min-h-0"
                            aria-label={t('invoices.selectItem', 'Select an item')}
                          >
                            <SelectValue placeholder={t('invoices.selectItem', 'Select an item')} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.map((entry) => (
                              <SelectItem key={entry.id} value={String(entry.id)}>
                                {entry.itemCode} — {entry.itemName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={item.itemName}
                          onChange={(event) => onUpdate(index, 'itemName', event.target.value)}
                          placeholder={t('items.itemName', 'Item Name')}
                          aria-label={t('invoices.itemNameOfLine', 'Name of line {line}', {
                            line: item.lineNumber,
                          })}
                          className="h-9 min-h-0"
                          disabled={disabled}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <NumericInput
                        value={item.quantity}
                        onValueChange={(value) => onUpdate(index, 'quantity', value ?? 0)}
                        aria-label={t('invoices.quantityShort', 'Qty')}
                        className="h-9 min-h-0"
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        list={UNIT_LIST_ID}
                        value={item.unitOfMeasure}
                        onChange={(event) => onUpdate(index, 'unitOfMeasure', event.target.value)}
                        aria-label={t('invoices.unitShort', 'Unit')}
                        className="h-9 min-h-0"
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumericInput
                        value={item.unitPrice}
                        onValueChange={(value) => onUpdate(index, 'unitPrice', value ?? 0)}
                        aria-label={t('items.unitPrice', 'Unit Price')}
                        suffix="₫"
                        className="h-9 min-h-0"
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumericInput
                        value={item.discountPercent}
                        onValueChange={(value) => onUpdate(index, 'discountPercent', value ?? 0)}
                        aria-label={t('invoices.discountPercentShort', 'Disc %')}
                        className="h-9 min-h-0"
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumericInput
                        value={item.taxPercent}
                        onValueChange={(value) => onUpdate(index, 'taxPercent', value ?? 0)}
                        aria-label={t('items.taxPercent', 'Tax %')}
                        className="h-9 min-h-0"
                        disabled={disabled}
                      />
                    </td>
                    <td className="numeric px-3 py-3 text-right text-sm font-semibold text-ink">
                      {formatCurrency(item.lineTotalWithTax)}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive-tint"
                        onClick={() => onRemove(index, item.itemName)}
                        disabled={disabled}
                        aria-label={t('invoices.removeLine', 'Remove line {line}', {
                          line: item.lineNumber,
                        })}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ══ MOBILE / TABLET ═════════════════════════════════════════════ */}
          <div className="flex flex-col divide-y divide-line lg:hidden">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="numeric text-xs font-semibold text-ink-muted">
                    {t('invoices.lineNumber', 'Line {line}', { line: item.lineNumber })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive-tint"
                    onClick={() => onRemove(index, item.itemName)}
                    disabled={disabled}
                    aria-label={t('invoices.removeLine', 'Remove line {line}', {
                      line: item.lineNumber,
                    })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <Select
                  value={catalogValueOf(item)}
                  onValueChange={(value) => handleCatalogChange(index, value)}
                  disabled={disabled}
                >
                  <SelectTrigger aria-label={t('invoices.selectItem', 'Select an item')}>
                    <SelectValue placeholder={t('invoices.selectItem', 'Select an item')} />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((entry) => (
                      <SelectItem key={entry.id} value={String(entry.id)}>
                        {entry.itemCode} — {entry.itemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  label={t('items.itemName', 'Item Name')}
                  value={item.itemName}
                  onChange={(event) => onUpdate(index, 'itemName', event.target.value)}
                  disabled={disabled}
                />

                <div className="grid grid-cols-2 gap-3">
                  <NumericInput
                    label={t('invoices.quantityShort', 'Qty')}
                    value={item.quantity}
                    onValueChange={(value) => onUpdate(index, 'quantity', value ?? 0)}
                    disabled={disabled}
                  />
                  <Input
                    label={t('invoices.unitShort', 'Unit')}
                    list={UNIT_LIST_ID}
                    value={item.unitOfMeasure}
                    onChange={(event) => onUpdate(index, 'unitOfMeasure', event.target.value)}
                    disabled={disabled}
                  />
                  <NumericInput
                    label={t('items.unitPrice', 'Unit Price')}
                    value={item.unitPrice}
                    onValueChange={(value) => onUpdate(index, 'unitPrice', value ?? 0)}
                    suffix="₫"
                    containerClassName="col-span-2"
                    disabled={disabled}
                  />
                  <NumericInput
                    label={t('invoices.discountPercentShort', 'Disc %')}
                    value={item.discountPercent}
                    onValueChange={(value) => onUpdate(index, 'discountPercent', value ?? 0)}
                    disabled={disabled}
                  />
                  <NumericInput
                    label={t('items.taxPercent', 'Tax %')}
                    value={item.taxPercent}
                    onValueChange={(value) => onUpdate(index, 'taxPercent', value ?? 0)}
                    disabled={disabled}
                  />
                </div>

                <div className="flex items-baseline justify-between border-t border-line pt-2">
                  <span className="text-sm text-ink-muted">
                    {t('invoices.lineTotal', 'Line Total')}
                  </span>
                  <span className="numeric text-lg font-semibold text-ink">
                    {formatCurrency(item.lineTotalWithTax)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ══ Cộng các dòng ═══════════════════════════════════════════════ */}
          <dl className="flex flex-col gap-1.5 border-t border-line p-4 sm:p-5">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-ink-muted">{t('invoices.subtotal', 'Subtotal')}</dt>
              <dd className="numeric text-ink">{formatCurrency(totals.afterDiscount)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-ink-muted">{t('invoices.totalTax', 'Total tax')}</dt>
              <dd className="numeric text-ink">{formatCurrency(totals.tax)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-1.5 text-sm font-semibold">
              <dt className="text-ink">{t('invoices.itemsTotal', 'Line items total')}</dt>
              <dd className="numeric text-ink">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
