import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Home, Calendar, Ban, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, AlertDialog } from '../ui';
import { customerService, rentalContractService } from '../../services';
import { formatDate } from '../../utils';
import type { Customer, RentalContract } from '../../types';
import { RentalContractStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

type PendingAction = {
  open: boolean;
  kind: 'end' | 'cancel';
  contract: RentalContract | null;
};

const noPendingAction: PendingAction = { open: false, kind: 'end', contract: null };

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

  const statusVariant = (status: RentalContractStatus) => {
    switch (status) {
      case RentalContractStatus.Active:
        return 'bg-green-100 text-green-800';
      case RentalContractStatus.Draft:
        return 'bg-blue-100 text-blue-800';
      case RentalContractStatus.Ended:
        return 'bg-gray-100 text-gray-800';
      case RentalContractStatus.Cancelled:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      const response = pendingAction.kind === 'end'
        ? await rentalContractService.endContract(contract.id)
        : await rentalContractService.cancelContract(contract.id);

      if (response.success) {
        showSuccess(pendingAction.kind === 'end'
          ? t('contracts.endSuccess', 'Contract ended')
          : t('contracts.cancelSuccess', 'Contract cancelled'));
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('common.back', 'Back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('contracts.title', 'Rental Contracts')}
            </h1>
            {customer && (
              <p className="text-sm text-gray-500">
                {customer.fullName || `${customer.firstName} ${customer.lastName}`}
              </p>
            )}
          </div>
        </div>

        <Button onClick={() => navigate(`/customers/${customerId}/contracts/new`)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('contracts.addContract', 'New Contract')}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">
              {t('contracts.noContractsFound', 'This customer has no rental contracts yet')}
            </p>
            <Button onClick={() => navigate(`/customers/${customerId}/contracts/new`)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('contracts.addFirstContract', 'Create the first contract')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map(contract => (
            <Card key={contract.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-4 w-4 text-gray-500" />
                  {t('rooms.roomLabel', 'Room {number}', {
                    number: contract.room?.roomNumber ?? contract.roomId,
                  })}
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusVariant(contract.status)}`}>
                    {contract.statusName}
                  </span>
                </CardTitle>

                <div className="flex items-center gap-2">
                  {contract.status === RentalContractStatus.Draft && (
                    <Button variant="outline" size="sm" onClick={() => handleActivate(contract)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t('contracts.activate', 'Activate')}
                    </Button>
                  )}

                  {(contract.status === RentalContractStatus.Draft ||
                    contract.status === RentalContractStatus.Active) && (
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
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingAction({ open: true, kind: 'cancel', contract })}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      {t('contracts.cancel', 'Cancel')}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t('contracts.period', 'Period')}
                    </div>
                    <div className="font-medium text-gray-900">
                      {formatDate(contract.startDate)} →{' '}
                      {contract.endDate ? formatDate(contract.endDate) : t('contracts.openEnded', 'open-ended')}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">{t('contracts.monthlyRent', 'Monthly rent')}</div>
                    <div className="font-medium text-gray-900">{contract.monthlyRent}</div>
                  </div>

                  <div>
                    <div className="text-gray-500">{t('contracts.securityDeposit', 'Deposit')}</div>
                    <div className="font-medium text-gray-900">{contract.securityDeposit}</div>
                  </div>

                  <div>
                    <div className="text-gray-500">{t('contracts.invoiceCount', 'Invoices')}</div>
                    <div className="font-medium text-gray-900">{contract.invoiceCount}</div>
                  </div>
                </div>

                {contract.notes && (
                  <p className="mt-3 text-sm text-gray-600">{contract.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingAction.open}
        onOpenChange={(open) => !open && setPendingAction(noPendingAction)}
        title={pendingAction.kind === 'end'
          ? t('contracts.endConfirmTitle', 'End this contract?')
          : t('contracts.cancelConfirmTitle', 'Cancel this contract?')}
        description={pendingAction.kind === 'end'
          ? t('contracts.endConfirmBody', 'The contract is kept for history and the room becomes vacant.')
          : t('contracts.cancelConfirmBody', 'The contract is kept for history and the room becomes vacant.')}
        confirmText={pendingAction.kind === 'end'
          ? t('contracts.end', 'End contract')
          : t('contracts.cancel', 'Cancel')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
