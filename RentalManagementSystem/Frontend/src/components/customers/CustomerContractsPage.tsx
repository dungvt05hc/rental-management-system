import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, FileText, Plus } from 'lucide-react';
import { Alert, AlertDialog, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '../ui';
import { customerService, rentalContractService } from '../../services';
import { formatCurrency, formatDate } from '../../utils';
import type { Customer, RentalContract } from '../../types';
import { RentalContractStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════════════
 * Hợp đồng của một khách thuê.
 *
 * Mỗi hợp đồng là một thẻ. Thẻ chứ không phải bảng: số hợp đồng của một người
 * thường chỉ vài cái, và mỗi cái mang theo một bộ nút khác nhau tuỳ trạng thái
 * — bảng có cột "Thao tác" mà mỗi dòng một kiểu nút thì đọc rất khó.
 *
 * LỖI ĐÃ SỬA: tiền thuê và tiền cọc in thẳng ra màn hình dưới dạng số thô —
 * "3400000" chứ không phải "3.400.000 ₫". Đây là hai con số người dùng phải đối
 * chiếu với hợp đồng giấy.
 *
 * Trạng thái hợp đồng chuyển sang chip của hệ thống thiết kế, tra qua cùng bảng
 * statusStyles với mọi trạng thái khác trong app — nên "Đang hiệu lực" ở đây
 * trông giống hệt "Đang hiệu lực" ở màn hình khách thuê.
 * ═══════════════════════════════════════════════════════════════════════════ */

type PendingAction = {
  open: boolean;
  kind: 'end' | 'cancel';
  contract: RentalContract | null;
};

const noPendingAction: PendingAction = { open: false, kind: 'end', contract: null };

/** Trạng thái hợp đồng → khoá tra trong statusStyles + nhãn hiển thị. */
const CONTRACT_STATUS = {
  [RentalContractStatus.Draft]: { key: 'contracts.statusDraft', fallback: 'Draft', tone: 'draft' },
  [RentalContractStatus.Active]: { key: 'contracts.statusActive', fallback: 'Active', tone: 'active' },
  [RentalContractStatus.Ended]: { key: 'contracts.statusEnded', fallback: 'Ended', tone: 'terminated' },
  [RentalContractStatus.Cancelled]: {
    key: 'contracts.statusCancelled',
    fallback: 'Cancelled',
    tone: 'cancelled',
  },
} as const;

export function CustomerContractsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(noPendingAction);

  const load = useCallback(async () => {
    if (!customerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [customerResponse, contractsResponse] = await Promise.all([
        customerService.getCustomer(customerId),
        rentalContractService.getContractsByCustomer(Number(customerId)),
      ]);

      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
      } else {
        setError(customerResponse.message || t('customers.notFound', 'Customer not found'));
      }

      if (contractsResponse.success && contractsResponse.data) {
        setContracts(contractsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async (contract: RentalContract) => {
    try {
      const response = await rentalContractService.activateContract(contract.id);
      if (response.success) {
        showSuccess(t('contracts.activateSuccess', 'Contract activated'));
        load();
      } else {
        showError(response.message || t('contracts.activateError', 'Could not activate contract'));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred'));
    }
  };

  const confirmPendingAction = async () => {
    const contract = pendingAction.contract;
    if (!contract) return;

    try {
      const response =
        pendingAction.kind === 'end'
          ? await rentalContractService.endContract(contract.id)
          : await rentalContractService.cancelContract(contract.id);

      if (response.success) {
        showSuccess(
          pendingAction.kind === 'end'
            ? t('contracts.endSuccess', 'Contract ended')
            : t('contracts.cancelSuccess', 'Contract cancelled')
        );
        load();
      } else {
        showError(response.message || t('contracts.actionError', 'Could not update contract'));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred'));
    } finally {
      setPendingAction(noPendingAction);
    }
  };

  const customerName = customer
    ? customer.fullName || `${customer.firstName} ${customer.lastName}`
    : undefined;

  const newContractButton = (
    <Button
      onClick={() => navigate(`/customers/${customerId}/contracts/new`)}
      leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
    >
      {t('contracts.addContract', 'New Contract')}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="self-start px-2"
        onClick={() => navigate('/customers')}
        leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
      >
        {t('customers.title', 'Customers')}
      </Button>

      <PageHeader
        title={t('contracts.title', 'Rental Contracts')}
        description={customerName}
        actions={newContractButton}
      />

      {error && (
        <Alert variant="error" title={t('contracts.loadError', 'Could not load contracts')}>
          {error}
        </Alert>
      )}

      {contracts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={t('contracts.noContractsFound', 'This customer has no rental contracts yet')}
          description={t(
            'contracts.noContractsBody',
            'A contract ties this customer to a room. Invoices are issued against it, so create one before billing.'
          )}
          action={newContractButton}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {contracts.map((contract) => {
            const statusInfo = CONTRACT_STATUS[contract.status];
            const canEnd =
              contract.status === RentalContractStatus.Draft ||
              contract.status === RentalContractStatus.Active;

            return (
              <li key={contract.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="numeric text-lg font-semibold text-ink">
                        {t('rooms.roomLabel', 'Room {number}', {
                          number: contract.room?.roomNumber ?? contract.roomId,
                        })}
                      </h2>
                      <div className="mt-1">
                        <Badge status={statusInfo?.tone ?? 'draft'} size="sm">
                          {statusInfo ? t(statusInfo.key, statusInfo.fallback) : contract.statusName}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {contract.status === RentalContractStatus.Draft && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(contract)}
                          leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                        >
                          {t('contracts.activate', 'Activate')}
                        </Button>
                      )}
                      {canEnd && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingAction({ open: true, kind: 'end', contract })}
                        >
                          {t('contracts.end', 'End contract')}
                        </Button>
                      )}
                      {contract.status === RentalContractStatus.Draft && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive-tint"
                          onClick={() => setPendingAction({ open: true, kind: 'cancel', contract })}
                          leadingIcon={<Ban className="h-4 w-4" aria-hidden="true" />}
                        >
                          {t('contracts.cancel', 'Cancel')}
                        </Button>
                      )}
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-ink-muted">{t('contracts.period', 'Period')}</dt>
                      {/* Gạch ngang chứ không phải mũi tên: đây là một khoảng
                          thời gian, không phải một chuyển động. */}
                      <dd className="numeric text-sm text-ink">
                        {formatDate(contract.startDate)} –{' '}
                        {contract.endDate
                          ? formatDate(contract.endDate)
                          : t('contracts.openEnded', 'open-ended')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('contracts.monthlyRent', 'Monthly rent')}
                      </dt>
                      <dd className="numeric text-sm font-medium text-ink">
                        {formatCurrency(contract.monthlyRent)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('contracts.securityDeposit', 'Deposit')}
                      </dt>
                      <dd className="numeric text-sm text-ink">
                        {formatCurrency(contract.securityDeposit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">
                        {t('contracts.invoiceCount', 'Invoices')}
                      </dt>
                      <dd className="numeric text-sm text-ink">{contract.invoiceCount}</dd>
                    </div>
                  </dl>

                  {contract.notes && (
                    <p className="mt-3 border-t border-line pt-3 text-sm whitespace-pre-line text-ink-muted">
                      {contract.notes}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={pendingAction.open}
        onOpenChange={(open) => !open && setPendingAction(noPendingAction)}
        title={
          pendingAction.kind === 'end'
            ? t('contracts.endConfirmTitle', 'End this contract?')
            : t('contracts.cancelConfirmTitle', 'Cancel this contract?')
        }
        description={
          pendingAction.kind === 'end'
            ? t('contracts.endConfirmBody', 'The contract is kept for history and the room becomes vacant.')
            : t('contracts.cancelConfirmBody', 'The contract is kept for history and the room becomes vacant.')
        }
        confirmText={
          pendingAction.kind === 'end'
            ? t('contracts.end', 'End contract')
            : t('contracts.cancel', 'Cancel')
        }
        cancelText={t('common.close', 'Close')}
        onConfirm={confirmPendingAction}
        variant="warning"
      />
    </div>
  );
}
