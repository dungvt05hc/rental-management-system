import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  Input,
  NumericInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import { customerService, rentalContractService, roomService } from '../../services';
import type { Customer, CreateRentalContractRequest, Room } from '../../types';
import { RentalContractStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils';

/* ═══════════════════════════════════════════════════════════════════════════
 * Lập hợp đồng thuê.
 *
 * HAI THỨ ĐÃ SỬA:
 *
 *   1. Ô tiền dùng NumericInput thay cho <input type="number">.
 *      type="number" ở trình duyệt chỉ nhận dấu chấm làm dấu thập phân, nên gõ
 *      "3.400.000" theo kiểu Việt Nam vào đó là ô rỗng hoặc ra 3.4. Người nhập
 *      tiền phòng gõ đúng kiểu Việt Nam.
 *
 *   2. Lỗi hiện CẠNH Ô SAI, không gom thành một khối đỏ ở đầu form. Bản cũ chỉ
 *      báo được MỘT lỗi mỗi lần bấm Lưu (mỗi nhánh kiểm tra đều `return` ngay),
 *      nên sai ba ô là phải bấm Lưu ba lần mới biết hết.
 *
 * Tiền thuê để trống là CÓ Ý: backend hiểu là lấy theo giá niêm yết của phòng.
 * Nên nó không bắt buộc, và ô có câu giải thích nói rõ điều đó.
 * ═══════════════════════════════════════════════════════════════════════════ */

type FieldName = 'roomId' | 'startDate' | 'endDate' | 'monthlyRent' | 'securityDeposit';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Hai trạng thái cho phép chọn lúc lập. Ended/Cancelled chỉ đến từ hành động sau đó. */
const STATUS_OPTIONS = [
  { status: RentalContractStatus.Active, key: 'contracts.statusActive', fallback: 'Active' },
  { status: RentalContractStatus.Draft, key: 'contracts.statusDraft', fallback: 'Draft' },
] as const;

function toContractStatus(raw: string): RentalContractStatus {
  const value = Number(raw);
  return STATUS_OPTIONS.find((option) => option.status === value)?.status ?? RentalContractStatus.Active;
}

export function RentalContractFormPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number | null>(null);
  const [securityDeposit, setSecurityDeposit] = useState<number | null>(0);
  const [status, setStatus] = useState(String(RentalContractStatus.Active));
  const [notes, setNotes] = useState('');

  const clearError = (field: FieldName) =>
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });

  const load = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const [customerResponse, roomsResponse] = await Promise.all([
        customerService.getCustomer(customerId),
        roomService.getAvailableRooms(),
      ]);
      if (customerResponse.success && customerResponse.data) setCustomer(customerResponse.data);
      if (roomsResponse.success && roomsResponse.data) setAvailableRooms(roomsResponse.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    load();
  }, [load]);

  /* Chọn phòng thì gợi ý luôn giá niêm yết của phòng — nhưng chỉ khi người dùng
     chưa tự nhập giá, để không ghi đè con số họ vừa gõ. */
  const handleRoomChange = (value: string) => {
    setRoomId(value);
    clearError('roomId');
    if (monthlyRent === null) {
      const room = availableRooms.find((entry) => String(entry.id) === value);
      if (room) setMonthlyRent(room.monthlyRent);
    }
  };

  /**
   * Kiểm tra HẾT các ô một lượt, không dừng ở lỗi đầu tiên.
   *
   * Trả về chính bảng lỗi chứ không trả boolean: setErrors chỉ có hiệu lực ở
   * lần render sau, nên đọc `errors` ngay sau khi gọi hàm này vẫn ra giá trị cũ
   * — và chỗ cuộn tới ô sai sẽ nhảy nhầm ô.
   */
  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!roomId) next.roomId = t('contracts.roomRequired', 'Please choose a room');
    if (!startDate) next.startDate = t('contracts.startDateRequired', 'Please choose a start date');
    if (startDate && endDate && endDate < startDate) {
      next.endDate = t('contracts.endBeforeStart', 'End date must not be before the start date');
    }
    if (monthlyRent !== null && monthlyRent < 0) {
      next.monthlyRent = t('validation.negative', 'The amount cannot be negative');
    }
    if (securityDeposit !== null && securityDeposit < 0) {
      next.securityDeposit = t('validation.negative', 'The amount cannot be negative');
    }

    setErrors(next);
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerId) return;
    setSubmitError(null);

    const found = validate();
    if (Object.keys(found).length > 0) {
      const order: FieldName[] = ['roomId', 'startDate', 'endDate', 'monthlyRent', 'securityDeposit'];
      const firstBad = order.find((field) => found[field]);
      const target = firstBad ? document.getElementById(`contract-${firstBad}`) : null;
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateRentalContractRequest = {
        customerId: Number(customerId),
        roomId: Number(roomId),
        startDate,
        endDate: endDate || undefined,
        // Bỏ trống = để backend lấy giá niêm yết của phòng.
        monthlyRent: monthlyRent ?? undefined,
        securityDeposit: securityDeposit ?? 0,
        status: toContractStatus(status),
        notes,
      };

      const response = await rentalContractService.createContract(payload);

      if (response.success) {
        showSuccess(t('contracts.createSuccess', 'Contract created'));
        navigate(`/customers/${customerId}/contracts`);
      } else {
        setSubmitError(response.message || t('contracts.createError', 'Could not create contract'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred');
      setSubmitError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = customer
    ? customer.fullName || `${customer.firstName} ${customer.lastName}`
    : undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="self-start px-2"
        onClick={() => navigate(`/customers/${customerId}/contracts`)}
        leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
      >
        {t('contracts.title', 'Rental Contracts')}
      </Button>

      <div>
        <h1 className="text-xl font-semibold text-ink">{t('contracts.addContract', 'New Contract')}</h1>
        {customerName && <p className="mt-0.5 text-sm text-ink-muted">{customerName}</p>}
      </div>

      {submitError && (
        <Alert variant="error" title={t('contracts.createError', 'Could not create contract')}>
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('contracts.details', 'Contract details')}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contract-roomId" className="mb-1.5 block text-sm font-medium text-ink">
                {t('contracts.room', 'Room')}
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
              </label>
              <Select value={roomId} onValueChange={handleRoomChange}>
                <SelectTrigger
                  id="contract-roomId"
                  aria-invalid={errors.roomId ? true : undefined}
                  aria-describedby={errors.roomId ? 'contract-roomId-error' : undefined}
                  className={errors.roomId ? 'border-destructive' : undefined}
                >
                  <SelectValue placeholder={t('contracts.selectRoom', 'Select a room')} />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })} —{' '}
                      {formatCurrency(room.monthlyRent)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId ? (
                <p id="contract-roomId-error" role="alert" className="mt-1.5 text-sm text-destructive">
                  {errors.roomId}
                </p>
              ) : (
                availableRooms.length === 0 && (
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {t('contracts.noVacantRooms', 'No vacant rooms right now — every room is taken.')}
                  </p>
                )
              )}
            </div>

            <div>
              <label htmlFor="contract-status" className="mb-1.5 block text-sm font-medium text-ink">
                {t('contracts.status', 'Status')}
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="contract-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.status} value={String(option.status)}>
                      {t(option.key, option.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              id="contract-startDate"
              type="date"
              label={t('contracts.startDate', 'Start date')}
              required
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                clearError('startDate');
              }}
              error={errors.startDate}
            />

            <Input
              id="contract-endDate"
              type="date"
              label={t('contracts.endDate', 'End date')}
              hint={t('contracts.endDateHint', 'Leave empty for an open-ended contract.')}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                clearError('endDate');
              }}
              error={errors.endDate}
            />

            <NumericInput
              id="contract-monthlyRent"
              label={t('contracts.monthlyRent', 'Monthly rent')}
              suffix="₫"
              hint={t('contracts.monthlyRentHint', "Leave empty to use the room's listed rent.")}
              value={monthlyRent}
              onValueChange={(value) => {
                setMonthlyRent(value);
                clearError('monthlyRent');
              }}
              error={errors.monthlyRent}
            />

            <NumericInput
              id="contract-securityDeposit"
              label={t('contracts.securityDeposit', 'Deposit')}
              suffix="₫"
              value={securityDeposit}
              onValueChange={(value) => {
                setSecurityDeposit(value);
                clearError('securityDeposit');
              }}
              error={errors.securityDeposit}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="contract-notes" className="mb-1.5 block text-sm font-medium text-ink">
              {t('contracts.notes', 'Notes')}
            </label>
            <textarea
              id="contract-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
            />
          </div>
        </Card>

        {/* Thanh dính đáy: tiền cọc và tiền thuê nằm cạnh nút Lưu, vì đó là hai
            con số người ta đối chiếu với hợp đồng giấy trước khi bấm. */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 py-3 shadow-sticky sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ink-muted">{t('contracts.monthlyRent', 'Monthly rent')}</p>
              <p className="numeric text-2xl font-semibold text-ink">
                {monthlyRent === null ? '—' : formatCurrency(monthlyRent)}
              </p>
              {securityDeposit !== null && securityDeposit > 0 && (
                <p className="text-xs text-ink-muted">
                  {t('contracts.securityDeposit', 'Deposit')}{' '}
                  <span className="numeric">{formatCurrency(securityDeposit)}</span>
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/customers/${customerId}/contracts`)}
                disabled={isSubmitting}
                className="max-sm:flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText={t('common.saving', 'Saving...')}
                leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
                className="max-sm:flex-1"
              >
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
