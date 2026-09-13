import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardInteractive,
  CardTitle,
  Checkbox,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  MultiSelect,
  NumericInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tooltip,
} from '../ui';
import type { DataTableColumn } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import { perceivedLightness, readToken, runAllChecks } from './contrast';

/* ═══════════════════════════════════════════════════════════════════════════
 * Chuỗi kiểm tra tiếng Việt.
 *
 * Ba chuỗi này không phải chọn ngẫu nhiên — mỗi chuỗi bắt một lỗi khác nhau:
 *   PHRASE  ép font phải có ườ / ế / ậ / Đ / ã và ký hiệu ₫ (U+20AB).
 *   UPPER   dấu thanh trên CHỮ HOA là chỗ font hay đặt đè lên nhau nhất.
 *   STACKED dấu chồng hai tầng (mũ + thanh) trên ơ / ư / ă / ê / ô.
 * ═══════════════════════════════════════════════════════════════════════════ */
const PHRASE = 'Phường Bến Nghé, Quận 1 — Đã thanh toán 1.500.000 ₫';
const UPPER = 'ĐƯỜNG NGUYỄN HUỆ, PHƯỜNG BẾN NGHÉ, QUẬN 1';
const STACKED = 'Ừ Ế Ộ Ữ Ỡ Ằ Ẵ Ợ Ậ Ọ · ừ ế ộ ữ ỡ ằ ẵ ợ ậ ọ';

// ── Khung dựng trang ─────────────────────────────────────────────────────────

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {lead && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Nhãn dưới mỗi mẫu — nói rõ đang xem trạng thái nào. */
function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 flex-wrap items-center gap-2">{children}</div>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  );
}

// ── §1 Tương phản ────────────────────────────────────────────────────────────

function ContrastSection() {
  const [checks, setChecks] = useState(() => runAllChecks());

  useEffect(() => {
    // Chạy lại sau khi font và CSS đã áp dụng xong.
    setChecks(runAllChecks());
  }, []);

  const failures = checks.filter((item) => !item.passes);

  return (
    <Section
      id="tuong-phan"
      title="1 · Kiểm tra tương phản"
      lead="Số đo trực tiếp từ token đang áp dụng trong trình duyệt này, không phải bảng chép tay. Sửa một hex trong index.css thì bảng dưới đổi theo ngay."
    >
      <div
        className={`mb-4 rounded-lg border p-3 text-sm font-medium ${
          failures.length === 0
            ? 'border-status-paid/30 bg-status-paid-tint text-status-paid'
            : 'border-status-overdue/30 bg-status-overdue-tint text-status-overdue'
        }`}
        role="status"
      >
        {failures.length === 0
          ? `Đạt WCAG AA — ${checks.length}/${checks.length} cặp màu qua ngưỡng.`
          : `${failures.length}/${checks.length} cặp màu KHÔNG đạt ngưỡng.`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Kết quả đo tương phản của từng cặp màu trong hệ thống</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="h-11 px-3 text-left text-xs font-semibold text-ink-muted">
                Cặp màu
              </th>
              <th scope="col" className="h-11 px-3 text-left text-xs font-semibold text-ink-muted">
                Mẫu
              </th>
              <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                Đo được
              </th>
              <th scope="col" className="h-11 px-3 text-right text-xs font-semibold text-ink-muted">
                Cần
              </th>
              <th scope="col" className="h-11 px-3 text-left text-xs font-semibold text-ink-muted">
                Kết quả
              </th>
            </tr>
          </thead>
          <tbody>
            {checks.map((item) => (
              <tr key={item.label} className="border-b border-line last:border-0">
                <td className="px-3 py-2.5">
                  {item.label}
                  {item.note && <span className="ml-1.5 text-xs text-ink-muted">{item.note}</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium"
                    style={{ color: item.foreground, backgroundColor: item.background }}
                  >
                    Aa Ừ 1.500.000 ₫
                  </span>
                </td>
                <td className="numeric px-3 py-2.5 text-right font-medium">{item.ratio.toFixed(2)}:1</td>
                <td className="numeric px-3 py-2.5 text-right text-ink-muted">{item.required.toFixed(1)}:1</td>
                <td className="px-3 py-2.5">
                  <Badge status={item.passes ? 'paid' : 'overdue'} size="sm">
                    {item.passes ? 'Đạt' : 'Hỏng'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── §2 Màu ───────────────────────────────────────────────────────────────────

const CORE_TOKENS = [
  ['--color-ink', 'ink', 'Chữ chính. Đen ngả xanh — đen tuyệt đối làm loang viền chữ có dấu trên LCD rẻ.'],
  ['--color-ink-muted', 'ink-muted', 'Chữ phụ: ngày tháng, mã hoá đơn, ghi chú.'],
  ['--color-canvas', 'canvas', 'Nền app. Thẻ trắng nổi lên mà không cần đổ bóng.'],
  ['--color-surface', 'surface', 'Nền thẻ, bảng, hộp thoại.'],
  ['--color-line', 'line', 'Kẻ chia trang trí trong thẻ. Không mang thông tin.'],
  ['--color-line-strong', 'line-strong', 'Viền ô nhập, checkbox. Phải đạt 3:1.'],
  ['--color-primary', 'primary', 'Nút hành động + focus ring. Khác họ với mọi màu trạng thái.'],
] as const;

const STATUS_TOKENS = [
  ['--color-status-available', 'Trống', 'available', 'solid'],
  ['--color-status-occupied', 'Đã thuê', 'occupied', 'tint'],
  ['--color-status-maintenance', 'Bảo trì', 'maintenance', 'solid'],
  ['--color-status-overdue', 'Quá hạn', 'overdue', 'solid'],
  ['--color-status-paid', 'Đã thanh toán', 'paid', 'tint'],
] as const;

function ColorSection() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const all = [...CORE_TOKENS.map((t) => t[0]), ...STATUS_TOKENS.map((t) => t[0])];
    setValues(Object.fromEntries(all.map((name) => [name, readToken(name)])));
  }, []);

  return (
    <Section
      id="mau"
      title="2 · Màu"
      lead="Sáu màu nền tảng và năm màu trạng thái. Hex đọc trực tiếp từ token."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Nền tảng">
          <ul className="flex flex-col gap-3">
            {CORE_TOKENS.map(([token, name, why]) => (
              <li key={token} className="flex items-start gap-3">
                <span
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-md border border-line"
                  style={{ backgroundColor: values[token] }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <code className="text-sm font-semibold text-ink">{name}</code>
                    <code className="numeric text-xs text-ink-muted">{values[token]}</code>
                  </div>
                  <p className="text-xs text-ink-muted">{why}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Trạng thái nghiệp vụ">
          <p className="mb-3 text-xs text-ink-muted">
            Độ đậm = mức độ cần hành động. Chip đặc cho việc chưa xong, chip nhạt cho trạng thái
            bình thường hoặc đã đóng sổ.
          </p>
          <ul className="flex flex-col gap-3">
            {STATUS_TOKENS.map(([token, label, key, tone]) => (
              <li key={token} className="flex items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-md border border-line"
                  style={{ backgroundColor: values[token] }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge status={key}>{label}</Badge>
                    <code className="numeric text-xs text-ink-muted">{values[token]}</code>
                  </div>
                  <p className="text-xs text-ink-muted">
                    chip {tone === 'solid' ? 'đặc — cần hành động' : 'nhạt — không đòi chú ý'} · độ sáng cảm nhận{' '}
                    <span className="numeric">{values[token] ? perceivedLightness(values[token]) : '—'}</span>%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 rounded-lg border border-status-maintenance/30 bg-status-maintenance-tint p-4">
        <h3 className="text-sm font-semibold text-status-maintenance">
          Giới hạn đã đo: màu một mình không đủ
        </h3>
        <p className="mt-1 text-sm text-ink">
          Ép cả năm màu đạt 4.5:1 với chữ trắng thì độ sáng cảm nhận của chúng dồn vào khoảng 35–41%.
          Nhìn hàng dưới ở dạng xám: chỉ còn năm ô gần như giống hệt nhau. Đây là lý do mọi chip
          trạng thái đều bắt buộc kèm hình khối và chữ, không bao giờ chỉ có màu.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_TOKENS.map(([, label, key]) => (
              <Badge key={key} status={key}>
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 grayscale" aria-hidden="true">
            {STATUS_TOKENS.map(([, label, key]) => (
              <Badge key={key} status={key} hideShape>
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            Hàng dưới: bỏ hình khối và chuyển sang xám — đúng cái người dùng mù màu đỏ-lục hoặc tờ
            hoá đơn in đen trắng nhìn thấy.
          </p>
        </div>
      </div>
    </Section>
  );
}

// ── §3 Chữ ───────────────────────────────────────────────────────────────────

const SCALE = [
  ['text-2xs', '11px / 16px', 'Đơn vị sau số: kWh, m²'],
  ['text-xs', '12px / 18px', 'Header cột, nhãn phụ'],
  ['text-sm', '13px / 20px', 'Nội dung ô trong bảng dày'],
  ['text-base', '15px / 22px', 'Chữ chính'],
  ['text-lg', '17px / 26px', 'Tiêu đề thẻ'],
  ['text-xl', '20px / 28px', 'Tiêu đề trang'],
  ['text-2xl', '24px / 32px', 'Số tiền trên thẻ tổng hợp'],
  ['text-3xl', '30px / 40px', 'Số tiền lớn nhất ở dashboard'],
] as const;

const AMOUNTS = [1500000, 2800000, 11100000, 940000, 1111111, 320000];

function TypographySection() {
  return (
    <Section
      id="chu"
      title="3 · Chữ"
      lead="Be Vietnam Pro cho chữ, Inter cho số. Line-height sàn 1.3 vì Be Vietnam Pro cần 1.265em mới chứa hết dấu trên chữ hoa."
    >
      <div className="flex flex-col gap-4">
        <Panel title="Thang chữ — mỗi cỡ kiểm bằng chuỗi có dấu đầy đủ">
          <ul className="flex flex-col divide-y divide-line">
            {SCALE.map(([cls, size, use]) => (
              <li key={cls} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="text-xs font-semibold text-ink">{cls}</code>
                  <code className="numeric text-xs text-ink-muted">{size}</code>
                  <span className="text-xs text-ink-muted">{use}</span>
                </div>
                <p className={cls}>{PHRASE}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Dấu trên chữ hoa">
            <p className="text-xl">{UPPER}</p>
            <p className="mt-3 text-2xl">{STACKED}</p>
            <p className="mt-3 text-xs text-ink-muted">
              Dấu thanh phải nằm gọn trong dòng, không chạm chữ dòng trên và không bị cắt ngọn.
              Đây cũng là lý do không dùng nhãn VIẾT HOA trong giao diện: ở tiếng Việt, dấu đụng
              trần chữ hoa làm đọc chậm hơn hẳn.
            </p>
          </Panel>

          <Panel title="Vì sao số dùng font riêng">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-ink">
                  Be Vietnam Pro — chữ số rộng hẹp khác nhau
                </p>
                <ul className="flex flex-col gap-0.5 text-right text-sm">
                  {AMOUNTS.map((amount) => (
                    <li key={amount} className="tabular-nums">
                      {formatCurrency(amount)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-ink">Inter + tabular-nums</p>
                <ul className="flex flex-col gap-0.5 text-right text-sm">
                  {AMOUNTS.map((amount) => (
                    <li key={amount} className="numeric">
                      {formatCurrency(amount)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Cột trái: chữ số "1" hẹp hơn "0" gần một nửa (385 so với 710 đơn vị, đo từ bảng hmtx),
              và font không có feature tnum nên hàng nghìn không thẳng cột. Cột phải là thứ người
              dùng thật sự phải dò từ trên xuống.
            </p>
          </Panel>
        </div>
      </div>
    </Section>
  );
}

// ── §4 Khoảng cách, bo góc, đổ bóng ──────────────────────────────────────────

function TokenSection() {
  return (
    <Section
      id="token"
      title="4 · Khoảng cách, bo góc, đổ bóng"
      lead="Lưới 4px. Ba bậc bo góc, mỗi bậc gắn một loại thành phần. Bóng chỉ cho thứ thật sự nổi lên trên."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Khoảng cách">
          <ul className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => (
              <li key={step} className="flex items-center gap-3">
                <code className="numeric w-12 shrink-0 text-xs text-ink-muted">{step * 4}px</code>
                <span className="h-3 bg-primary" style={{ width: step * 4 }} aria-hidden="true" />
              </li>
            ))}
            <li className="mt-2 flex items-center gap-3 border-t border-line pt-3">
              <code className="numeric w-12 shrink-0 text-xs font-semibold text-ink">44px</code>
              <span className="h-3 w-touch bg-status-overdue" aria-hidden="true" />
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            44px (<code>touch</code>) là chiều cao tối thiểu của mọi thứ bấm được trên mobile.
          </p>
        </Panel>

        <Panel title="Bo góc">
          <ul className="flex flex-col gap-3">
            {[
              ['rounded-sm', '4px', 'Chip trạng thái, badge'],
              ['rounded-md', '6px', 'Nút, ô nhập, select'],
              ['rounded-lg', '10px', 'Thẻ, dialog, popover'],
              ['rounded-xl', '14px', 'Sheet trên mobile'],
              ['rounded-full', '—', 'Chỉ avatar'],
            ].map(([cls, px, use]) => (
              <li key={cls} className="flex items-center gap-3">
                <span className={`h-10 w-10 shrink-0 border border-line-strong bg-secondary ${cls}`} aria-hidden="true" />
                <div>
                  <code className="block text-xs font-semibold text-ink">{cls}</code>
                  <span className="text-xs text-ink-muted">
                    <span className="numeric">{px}</span> · {use}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Đổ bóng">
          <ul className="flex flex-col gap-4">
            {[
              ['shadow-none', 'Thẻ và bảng — phân tách bằng viền'],
              ['shadow-overlay', 'Dropdown, popover, tooltip'],
              ['shadow-dialog', 'Dialog, sheet'],
              ['shadow-sticky', 'Thanh hành động dính đáy'],
            ].map(([cls, use]) => (
              <li key={cls} className="flex items-center gap-3">
                <span className={`h-10 w-16 shrink-0 rounded-lg border border-line bg-surface ${cls}`} aria-hidden="true" />
                <div>
                  <code className="block text-xs font-semibold text-ink">{cls}</code>
                  <span className="text-xs text-ink-muted">{use}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            Bóng nhuộm theo ink chứ không phải xám trung tính — xám trung tính trên nền canvas ngả
            lạnh trông đục.
          </p>
        </Panel>
      </div>
    </Section>
  );
}

// ── §5 Component ─────────────────────────────────────────────────────────────

interface DemoRow {
  id: number;
  room: string;
  customer: string;
  amount: number;
  remaining: number;
  status: string;
  statusLabel: string;
  due: string;
}

const DEMO_ROWS: DemoRow[] = [
  { id: 1, room: 'Phòng 201', customer: 'Nguyễn Văn Bảo', amount: 2500000, remaining: 2500000, status: 'overdue', statusLabel: 'Quá hạn', due: '2026-09-05' },
  { id: 2, room: 'Phòng 202', customer: 'Trần Thị Hường', amount: 3100000, remaining: 0, status: 'paid', statusLabel: 'Đã thanh toán', due: '2026-09-05' },
  { id: 3, room: 'Phòng 203', customer: 'Lê Quốc Đạt', amount: 2500000, remaining: 1000000, status: 'partiallypaid', statusLabel: 'Thu một phần', due: '2026-09-10' },
  { id: 4, room: 'Phòng 301', customer: 'Phạm Thị Mỹ Lệ', amount: 4200000, remaining: 0, status: 'paid', statusLabel: 'Đã thanh toán', due: '2026-09-10' },
];

function ComponentSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [amount, setAmount] = useState<number | null>(1500000);
  const [multi, setMulti] = useState<string[]>(['tang-1']);
  const [selected, setSelected] = useState<Set<string | number>>(new Set([1]));

  const columns: DataTableColumn<DemoRow>[] = useMemo(
    () => [
      { key: 'room', header: 'Phòng', cell: (row) => <span className="font-medium">{row.room}</span>, mobile: 'title' },
      { key: 'customer', header: 'Khách hàng', cell: (row) => row.customer },
      { key: 'amount', header: 'Số tiền', cell: (row) => formatCurrency(row.amount), numeric: true },
      { key: 'remaining', header: 'Còn lại', cell: (row) => formatCurrency(row.remaining), numeric: true, mobile: 'primary' },
      {
        key: 'status',
        header: 'Trạng thái',
        cell: (row) => (
          <Badge status={row.status} size="sm">
            {row.statusLabel}
          </Badge>
        ),
        mobile: 'status',
      },
      { key: 'due', header: 'Hạn', cell: (row) => formatDate(row.due), numeric: true },
    ],
    []
  );

  return (
    <Section
      id="component"
      title="5 · Component"
      lead="Rê chuột để xem trạng thái hover, nhấn Tab để xem focus ring. Mọi thứ ở đây là component thật, không phải ảnh chụp."
    >
      <div className="flex flex-col gap-4">
        {/* ── Button ──────────────────────────────────────────────────────── */}
        <Panel title="Button">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Sample label="variant — mặc định">
              <Button>Ghi nhận thu tiền</Button>
              <Button variant="secondary">Phụ</Button>
              <Button variant="outline">Viền</Button>
            </Sample>
            <Sample label="variant — còn lại">
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Xoá hoá đơn</Button>
            </Sample>
            <Sample label="hover (ép trạng thái để đối chiếu)">
              <Button className="bg-primary-hover">Chính</Button>
              <Button variant="destructive" className="bg-destructive-hover">
                Xoá
              </Button>
            </Sample>
            <Sample label="size — sm / md / lg / icon">
              <Button size="sm">Nhỏ</Button>
              <Button size="md">Vừa</Button>
              <Button size="lg">Lớn</Button>
              <Button size="icon" aria-label="Thêm">
                <Plus className="h-4 w-4" />
              </Button>
            </Sample>
            <Sample label="disabled">
              <Button disabled>Chính</Button>
              <Button variant="outline" disabled>
                Viền
              </Button>
              <Button variant="destructive" disabled>
                Xoá
              </Button>
            </Sample>
            <Sample label="loading — spinner được miễn trừ prefers-reduced-motion">
              <Button isLoading>Đang lưu</Button>
              <Button variant="outline" isLoading loadingText="Đang xuất PDF…">
                Xuất PDF
              </Button>
            </Sample>
            <Sample label="có icon dẫn đầu">
              <Button leadingIcon={<Plus className="h-4 w-4" />}>Tạo hoá đơn</Button>
              <Button variant="destructive" leadingIcon={<Trash2 className="h-4 w-4" />}>
                Xoá
              </Button>
            </Sample>
            <Sample label="fullWidth — dùng cho thanh dính đáy trên mobile">
              <Button fullWidth size="lg">
                Ghi nhận đã thu 1.500.000 ₫
              </Button>
            </Sample>
          </div>
        </Panel>

        {/* ── Badge ───────────────────────────────────────────────────────── */}
        <Panel title="Badge — chip trạng thái">
          <div className="grid gap-5 sm:grid-cols-2">
            <Sample label="phòng">
              <Badge status="vacant">Trống</Badge>
              <Badge status="rented">Đã thuê</Badge>
              <Badge status="maintenance">Bảo trì</Badge>
              <Badge status="reserved">Đã giữ chỗ</Badge>
            </Sample>
            <Sample label="hoá đơn">
              <Badge status="draft">Nháp</Badge>
              <Badge status="unpaid">Chưa thu</Badge>
              <Badge status="partiallypaid">Thu một phần</Badge>
              <Badge status="overdue">Quá hạn</Badge>
              <Badge status="paid">Đã thanh toán</Badge>
            </Sample>
            <Sample label="size sm — dùng trong bảng dày">
              <Badge status="overdue" size="sm">
                Quá hạn
              </Badge>
              <Badge status="paid" size="sm">
                Đã thanh toán
              </Badge>
            </Sample>
            <Sample label="variant không gắn trạng thái">
              <Badge>Mặc định</Badge>
              <Badge variant="secondary">Phụ</Badge>
              <Badge variant="destructive">Cảnh báo</Badge>
              <Badge variant="outline">Viền</Badge>
            </Sample>
          </div>
        </Panel>

        {/* ── Ô nhập ──────────────────────────────────────────────────────── */}
        <Panel title="Input · NumericInput · Select · MultiSelect">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Input label="Tên khách thuê" placeholder="Nguyễn Văn Bảo" defaultValue="Trần Thị Hường" />
              <span className="text-xs text-ink-muted">mặc định — label thật, không phải placeholder</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input label="Địa chỉ thường trú" required hint="Ghi theo hộ khẩu, gồm cả phường và quận." />
              <span className="text-xs text-ink-muted">bắt buộc + câu giải thích</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input label="Số điện thoại" defaultValue="090" error="Số điện thoại phải có 10 chữ số." />
              <span className="text-xs text-ink-muted">lỗi — aria-invalid + role=&quot;alert&quot;</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input label="Tìm phòng" placeholder="Số phòng hoặc tên khách" prefix={<Search className="h-4 w-4" />} />
              <span className="text-xs text-ink-muted">có icon dẫn đầu</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input label="Mã hoá đơn" defaultValue="HD-2026-09-0142" readOnly numeric />
              <span className="text-xs text-ink-muted">readOnly — vẫn chép được</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input label="Chủ hợp đồng" defaultValue="Không sửa được" disabled />
              <span className="text-xs text-ink-muted">disabled</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <NumericInput label="Tiền thuê hằng tháng" value={amount} onValueChange={setAmount} suffix="₫" />
              <span className="text-xs text-ink-muted">
                gõ &quot;1.500.000&quot; theo kiểu Việt Nam · giá trị: <span className="numeric">{amount ?? 'null'}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <NumericInput label="Chỉ số điện" value={4820} onValueChange={() => {}} suffix="kWh" />
              <span className="text-xs text-ink-muted">đơn vị ở đuôi ô</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="mb-1.5 block text-sm font-medium text-ink" id="ds-select-label">
                Tầng
              </label>
              <Select defaultValue="1">
                <SelectTrigger aria-labelledby="ds-select-label">
                  <SelectValue placeholder="Chọn tầng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tầng 1</SelectItem>
                  <SelectItem value="2">Tầng 2</SelectItem>
                  <SelectItem value="3">Tầng 3</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-ink-muted">Select</span>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-ink" id="ds-multi-label">
                Tầng áp dụng
              </label>
              <div aria-labelledby="ds-multi-label">
                <MultiSelect
                  options={[
                    { value: 'tang-1', label: 'Tầng 1' },
                    { value: 'tang-2', label: 'Tầng 2' },
                    { value: 'tang-3', label: 'Tầng 3' },
                  ]}
                  value={multi}
                  onChange={setMulti}
                />
              </div>
              <span className="text-xs text-ink-muted">MultiSelect</span>
            </div>
          </div>
        </Panel>

        {/* ── Checkbox / Switch ───────────────────────────────────────────── */}
        <Panel title="Checkbox · Switch">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Sample label="checkbox — bật / tắt / một phần / disabled">
              <Checkbox checked={checked} onCheckedChange={setChecked} aria-label="Đã thu tiền" />
              <Checkbox checked={false} onCheckedChange={() => {}} aria-label="Chưa thu" />
              <Checkbox indeterminate onCheckedChange={() => {}} aria-label="Chọn một phần" />
              <Checkbox checked disabled aria-label="Khoá" />
            </Sample>
            <Sample label="switch — bật / tắt / disabled">
              <Switch checked={switched} onCheckedChange={setSwitched} aria-label="Tự động gửi nhắc" />
              <Switch checked={false} onCheckedChange={() => {}} aria-label="Tắt" />
              <Switch checked disabled aria-label="Khoá" />
            </Sample>
            <Sample label="vùng bấm 44px (không đổi kích thước hiện)">
              <span className="rounded-sm outline outline-1 outline-dashed outline-line-strong">
                <Checkbox checked onCheckedChange={() => {}} aria-label="Ví dụ vùng bấm" />
              </span>
            </Sample>
            <Sample label="Separator">
              <div className="w-full">
                <Separator />
              </div>
            </Sample>
          </div>
        </Panel>

        {/* ── Alert ───────────────────────────────────────────────────────── */}
        <Panel title="Alert">
          <div className="flex flex-col gap-3">
            <Alert variant="error" title="Không gửi được nhắc nợ" onClose={() => {}}>
              7 hoá đơn quá hạn chưa gửi được tin nhắn. Kiểm tra lại số điện thoại của khách.
            </Alert>
            <Alert variant="warning" title="Sắp đến hạn">
              12 hoá đơn đến hạn trong 3 ngày tới, tổng 31.800.000 ₫.
            </Alert>
            <Alert variant="success" title="Đã ghi nhận">
              Đã thu 2.500.000 ₫ của phòng 201.
            </Alert>
            <Alert variant="info">Kỳ tính tiền tháng 9 sẽ chốt vào ngày 30/09/2026.</Alert>
          </div>
        </Panel>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <Panel title="Card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Đã thu tháng này</CardTitle>
                <CardDescription>Kỳ 09/2026</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="numeric text-3xl font-semibold text-ink">148.200.000 ₫</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Đạt <span className="numeric">82%</span> kế hoạch
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Xem chi tiết
                </Button>
              </CardFooter>
            </Card>

            <CardInteractive className="p-4">
              <p className="text-sm font-semibold text-ink">Phòng 203</p>
              <p className="mt-1 text-sm text-ink-muted">Lê Quốc Đạt</p>
              <div className="mt-2">
                <Badge status="maintenance" size="sm">
                  Bảo trì
                </Badge>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                CardInteractive — thẻ này bấm được nên nó có hover và focus ring
              </p>
            </CardInteractive>

            <Card className="p-4">
              <p className="text-sm text-ink-muted">Skeleton khi chờ dữ liệu</p>
              <div className="mt-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
          </div>
        </Panel>

        {/* ── Lớp nổi ─────────────────────────────────────────────────────── */}
        <Panel title="Dialog · AlertDialog · DropdownMenu · Tooltip">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Mở Dialog
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Mở hộp xác nhận
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Thao tác</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Hoá đơn 201</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Ghi nhận thu tiền</DropdownMenuItem>
                <DropdownMenuItem>Gửi nhắc nợ</DropdownMenuItem>
                <DropdownMenuItem>In hoá đơn</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Huỷ hoá đơn</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip content="Tiền thuê chưa gồm điện nước">
              <Button variant="ghost">Rê chuột hoặc Tab vào đây</Button>
            </Tooltip>
          </div>

          <p className="mt-3 text-xs text-ink-muted">
            Dialog và hộp xác nhận đều bẫy tiêu điểm, đóng bằng Escape, khoá cuộn nền và trả tiêu
            điểm về nút đã mở khi đóng.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ghi nhận thu tiền — Phòng 201</DialogTitle>
                <DialogClose onClose={() => setDialogOpen(false)} />
              </DialogHeader>
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                <Input label="Khách thuê" defaultValue="Nguyễn Văn Bảo" readOnly />
                <NumericInput label="Số tiền thu" value={2500000} onValueChange={() => {}} suffix="₫" />
                <Input label="Ghi chú" placeholder="Thu tại phòng, tiền mặt" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Huỷ
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Ghi nhận</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant="destructive"
            title="Huỷ hoá đơn HD-2026-09-0142?"
            description="Hoá đơn đã gửi cho khách. Huỷ rồi thì phải tạo lại từ đầu, số hoá đơn cũ không dùng lại được."
            confirmText="Huỷ hoá đơn"
            cancelText="Giữ lại"
            onConfirm={() => new Promise((resolve) => setTimeout(resolve, 600))}
          />
        </Panel>

        {/* ── DataTable ───────────────────────────────────────────────────── */}
        <Panel title="DataTable — bảng trên desktop, thẻ trên mobile">
          <p className="mb-3 text-xs text-ink-muted">
            Thu hẹp cửa sổ xuống dưới 640px để thấy bảng đổi sang dạng thẻ. Không có phương án cuộn
            ngang.
          </p>
          <DataTable
            columns={columns}
            rows={DEMO_ROWS}
            rowKey={(row) => row.id}
            caption="Danh sách hoá đơn kỳ 09/2026"
            rowStatus={(row) => row.status}
            selectedKeys={selected}
            onSelectionChange={setSelected}
            selectionLabel={(row) => `Chọn hoá đơn ${row.room}`}
            bulkActions={
              <>
                <Button size="sm" variant="outline">
                  Gửi nhắc
                </Button>
                <Button size="sm" variant="outline">
                  Xuất PDF
                </Button>
              </>
            }
            mobileActions={(row) => (
              <>
                <Button size="sm">Thu tiền</Button>
                <Button size="sm" variant="outline">
                  Chi tiết {row.room}
                </Button>
              </>
            )}
          />

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-ink">Đang tải</p>
              <DataTable columns={columns} rows={[]} rowKey={(row) => row.id} caption="Đang tải" isLoading skeletonRows={3} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink">Rỗng</p>
              <DataTable
                columns={columns}
                rows={[]}
                rowKey={(row) => row.id}
                caption="Không có hoá đơn"
                emptyState="Kỳ này chưa có hoá đơn nào. Tạo hoá đơn đầu tiên để bắt đầu thu tiền."
              />
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}

// ── Trang ────────────────────────────────────────────────────────────────────

const NAV = [
  ['tuong-phan', 'Tương phản'],
  ['mau', 'Màu'],
  ['chu', 'Chữ'],
  ['token', 'Token'],
  ['component', 'Component'],
] as const;

export function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-ink">Hệ thống thiết kế</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Trang nội bộ. Mọi token và component ở đây là thứ đang chạy thật trong app — không phải
          bản chụp. Trang này tự đo lại tương phản mỗi lần mở, nên nếu ai đó sửa một hex trong
          index.css mà làm hỏng ngưỡng AA thì mục 1 sẽ báo đỏ.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Mục lục">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="focus-ring rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-100 hover:bg-secondary"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <ContrastSection />
      <ColorSection />
      <TypographySection />
      <TokenSection />
      <ComponentSection />
    </div>
  );
}
