import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../ui';
import { customerService, roomService, rentalContractService } from '../../services';
import type { Customer, Room, CreateRentalContractRequest } from '../../types';
import { RentalContractStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { parseDecimalInput } from '../../utils';

export function RentalContractFormPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    roomId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '0',
    status: String(RentalContractStatus.Active),
    notes: '',
  });

  const load = useCallback(async () => {
    if (!customerId) return;

    setIsLoading(true);
    try {
      const [customerResponse, roomsResponse] = await Promise.all([
        customerService.getCustomer(customerId),
        roomService.getAvailableRooms(),
      ]);

      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
      }

      if (roomsResponse.success && roomsResponse.data) {
        setAvailableRooms(roomsResponse.data);
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

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Chọn phòng thì mặc định lấy giá thuê của phòng, người dùng vẫn sửa được
  const handleRoomChange = (roomId: string) => {
    const room = availableRooms.find(r => String(r.id) === roomId);
    setFormData(prev => ({
      ...prev,
      roomId,
      monthlyRent: room && !prev.monthlyRent ? String(room.monthlyRent) : prev.monthlyRent,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    setError(null);

    if (!formData.roomId) {
      setError(t('contracts.roomRequired', 'Please choose a room'));
      return;
    }

    if (!formData.startDate) {
      setError(t('contracts.startDateRequired', 'Please choose a start date'));
      return;
    }

    if (formData.endDate && formData.endDate < formData.startDate) {
      setError(t('contracts.endBeforeStart', 'End date must not be before the start date'));
      return;
    }

    const monthlyRent = formData.monthlyRent ? parseDecimalInput(formData.monthlyRent) : undefined;
    if (monthlyRent !== undefined && (monthlyRent === null || monthlyRent < 0)) {
      setError(t('contracts.rentInvalid', 'Monthly rent must be a valid amount'));
      return;
    }

    const securityDeposit = parseDecimalInput(formData.securityDeposit || '0');
    if (securityDeposit === null || securityDeposit < 0) {
      setError(t('contracts.depositInvalid', 'Security deposit must be a valid amount'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateRentalContractRequest = {
        customerId: Number(customerId),
        roomId: parseInt(formData.roomId),
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        monthlyRent,
        securityDeposit,
        status: Number(formData.status) as RentalContractStatus,
        notes: formData.notes,
      };

      const response = await rentalContractService.createContract(payload);

      if (response.success) {
        showSuccess(t('contracts.createSuccess', 'Contract created'));
        navigate(`/customers/${customerId}/contracts`);
      } else {
        setError(response.message || t('contracts.createError', 'Could not create contract'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.unexpectedError', 'An error occurred');
      setError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/customers/${customerId}/contracts`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.back', 'Back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('contracts.addContract', 'New Contract')}
          </h1>
          {customer && (
            <p className="text-sm text-gray-500">
              {customer.fullName || `${customer.firstName} ${customer.lastName}`}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('contracts.details', 'Contract details')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.room', 'Room')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('contracts.selectRoom', 'Select a room')}</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber} — {room.typeName || 'N/A'} ({room.monthlyRent})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.status', 'Status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RentalContractStatus.Active}>
                    {t('contracts.statusActive', 'Active')}
                  </option>
                  <option value={RentalContractStatus.Draft}>
                    {t('contracts.statusDraft', 'Draft')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.startDate', 'Start date')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.endDate', 'End date')}
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.monthlyRent', 'Monthly rent')}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthlyRent}
                  onChange={(e) => handleChange('monthlyRent', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('contracts.securityDeposit', 'Deposit')}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.securityDeposit}
                  onChange={(e) => handleChange('securityDeposit', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contracts.notes', 'Notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/customers/${customerId}/contracts`)}
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-1" />
                {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
