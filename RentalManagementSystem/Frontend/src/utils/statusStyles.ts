/**
 * Bảng ánh xạ trạng thái nghiệp vụ → cách hiển thị.
 *
 * Đây là nguồn sự thật duy nhất cho màu trạng thái. Không tô màu trạng thái
 * bằng class Tailwind rời rạc ở trong màn hình nghiệp vụ.
 *
 * ═══ Quy tắc: ĐỘ ĐẬM = MỨC ĐỘ CẦN HÀNH ĐỘNG ═══
 *
 * Admin template tô mọi trạng thái bằng pastel cùng độ đậm như nhau, khiến
 * "Quá hạn" và "Đã thanh toán" nặng ngang nhau trên võng mạc. Ở đây:
 *
 *   solid → việc chưa xong, có người phải làm gì đó.
 *           Trống · Bảo trì · Quá hạn · Chưa thu · Thu một phần
 *   tint  → trạng thái bình thường hoặc đã đóng sổ, không đòi hành động.
 *           Đã thuê · Đã thanh toán · Nháp · Đã huỷ · Ngừng thuê
 *
 * "Đã thuê" dùng xám-ink chứ không dùng màu: phòng có người ở là trạng thái
 * mặc định của đa số dòng, nó không nên đòi sự chú ý.
 *
 * ═══ Vì sao mỗi trạng thái bắt buộc có icon ═══
 *
 * Số đo: ép cả năm màu trạng thái đạt 4.5:1 với chữ trắng thì độ sáng cảm nhận
 * của chúng dồn vào khoảng L 35–41%. In đen trắng — hoá đơn có in — hoặc với
 * người mù màu đỏ-lục, năm trạng thái này không phân biệt được bằng màu. Đây là
 * giới hạn vật lý của ràng buộc AA chứ không phải chọn hex chưa khéo. Nên chip
 * luôn gồm ba lớp: hình khối + chữ + màu.
 *
 * ═══ Ghi chú về dùng lại màu ═══
 *
 * `maintenance` (hổ phách) dùng cho cả "Bảo trì" của phòng lẫn "Chưa thu /
 * Thu một phần" của hoá đơn. Dùng lại được vì trạng thái phòng và trạng thái
 * hoá đơn không bao giờ nằm chung một cột: người đọc luôn biết mình đang nhìn
 * bảng nào.
 */

export type StatusTone = 'solid' | 'tint';

/** Hình khối đi kèm — Badge dịch tên này ra icon thật. */
export type StatusShape =
  | 'ring' // ○ vòng rỗng — trống, chưa có gì trong đó
  | 'dot' // ● chấm đặc — đang có người ở
  | 'wrench' // bảo trì
  | 'alert' // cần xử lý gấp
  | 'check' // đã xong
  | 'half' // ◐ mới xong một phần
  | 'clock' // đang chờ
  | 'cross'; // đã huỷ / đã chấm dứt

export interface StatusStyle {
  tone: StatusTone;
  shape: StatusShape;
  /** Class đầy đủ, viết literal để Tailwind quét ra được. */
  className: string;
}

const SOLID = {
  available: 'bg-status-available text-white',
  occupied: 'bg-status-occupied text-white',
  maintenance: 'bg-status-maintenance text-white',
  overdue: 'bg-status-overdue text-white',
  paid: 'bg-status-paid text-white',
} as const;

const TINT = {
  available: 'bg-status-available-tint text-status-available',
  occupied: 'bg-status-occupied-tint text-status-occupied',
  maintenance: 'bg-status-maintenance-tint text-status-maintenance',
  overdue: 'bg-status-overdue-tint text-status-overdue',
  paid: 'bg-status-paid-tint text-status-paid',
} as const;

/**
 * Khoá là tên enum phía backend (ASP.NET serialize enum ra số, phía frontend
 * đổi ra tên trước khi tra bảng này). Khoá tra không phân biệt hoa thường.
 */
const STATUS_STYLES: Record<string, StatusStyle> = {
  // ─── Phòng (RoomStatus) ───────────────────────────────────────────────────
  // Trống là việc cần làm: phòng trống ngày nào là mất tiền ngày đó. Nhưng vẫn
  // giữ màu xanh theo quy ước quen thuộc, chỉ nâng lên chip đặc để nó không
  // chìm mất giữa một bảng toàn phòng đã thuê.
  vacant: { tone: 'solid', shape: 'ring', className: SOLID.available },
  available: { tone: 'solid', shape: 'ring', className: SOLID.available },
  rented: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  occupied: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  maintenance: { tone: 'solid', shape: 'wrench', className: SOLID.maintenance },
  // Đã giữ chỗ: không còn để cho thuê nữa nhưng cũng chưa cần làm gì.
  reserved: { tone: 'tint', shape: 'clock', className: TINT.available },

  // ─── Khách thuê / hợp đồng ────────────────────────────────────────────────
  active: { tone: 'tint', shape: 'check', className: TINT.paid },
  inactive: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  // Đã chấm dứt: dùng màu đỏ nhưng ở dạng nhạt — nó là kết cục, không phải việc
  // đang cần xử lý.
  terminated: { tone: 'tint', shape: 'cross', className: TINT.overdue },
  expired: { tone: 'tint', shape: 'cross', className: TINT.overdue },

  // ─── Hoá đơn (InvoiceStatus) ──────────────────────────────────────────────
  draft: { tone: 'tint', shape: 'clock', className: TINT.occupied },
  issued: { tone: 'tint', shape: 'clock', className: TINT.occupied },
  pending: { tone: 'solid', shape: 'clock', className: SOLID.maintenance },
  unpaid: { tone: 'solid', shape: 'alert', className: SOLID.maintenance },
  partiallypaid: { tone: 'solid', shape: 'half', className: SOLID.maintenance },
  overdue: { tone: 'solid', shape: 'alert', className: SOLID.overdue },
  paid: { tone: 'tint', shape: 'check', className: TINT.paid },
  cancelled: { tone: 'tint', shape: 'cross', className: TINT.occupied },

  // ─── Lời mời (InvitationStatus) ───────────────────────────────────────────
  accepted: { tone: 'tint', shape: 'check', className: TINT.paid },
  revoked: { tone: 'tint', shape: 'cross', className: TINT.occupied },

  // ─── Hình thức thanh toán ─────────────────────────────────────────────────
  // Tiền mặt / chuyển khoản / thẻ KHÔNG phải trạng thái, chúng là phân loại.
  // Trước đây mỗi loại một màu (lục / lam / tím / chàm) — bốn màu không mang
  // thông tin gì, chỉ cạnh tranh chú ý với cột trạng thái thật ngay bên cạnh.
  // Nay để trung tính hết.
  cash: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  banktransfer: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  check: { tone: 'tint', shape: 'dot', className: TINT.occupied },
  creditcard: { tone: 'tint', shape: 'dot', className: TINT.occupied },
};

const FALLBACK: StatusStyle = {
  tone: 'tint',
  shape: 'dot',
  className: TINT.occupied,
};

/** Tra cách hiển thị của một trạng thái. Không biết trạng thái thì trả về trung tính. */
export function getStatusStyle(status: string | null | undefined): StatusStyle {
  if (!status) return FALLBACK;
  return STATUS_STYLES[status.toLowerCase().replace(/[\s_-]/g, '')] ?? FALLBACK;
}

/** Chỉ lấy phần class màu. Giữ lại cho chỗ nào chỉ cần tô nền, không dựng cả chip. */
export function getStatusColor(status: string): string {
  return getStatusStyle(status).className;
}
