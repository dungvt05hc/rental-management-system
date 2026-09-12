import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, Button, Input } from '../ui';
import { customerService, roomService } from '../../services';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest, Room } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { parseDecimalInput } from '../../utils';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    identificationNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    roomId: '',
    contractStartDate: '',
    contractEndDate: '',
    securityDeposit: '',
    monthlyRent: '',
    isActive: true,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadAvailableRooms();
      if (customer) {
        setFormData({
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phoneNumber: customer.phoneNumber || '',
          dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
          identificationNumber: customer.identificationNumber || '',
          emergencyContactName: customer.emergencyContactName || '',
          emergencyContactPhone: customer.emergencyContactPhone || '',
          roomId: customer.room?.id?.toString() || '',
          contractStartDate: customer.contractStartDate ? customer.contractStartDate.split('T')[0] : '',
          contractEndDate: customer.contractEndDate ? customer.contractEndDate.split('T')[0] : '',
          securityDeposit: customer.securityDeposit?.toString() || '0',
          monthlyRent: customer.monthlyRent?.toString() || '0',
          isActive: customer.isActive !== undefined ? customer.isActive : true,
          notes: customer.notes || '',
        });
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          dateOfBirth: '',
          identificationNumber: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          roomId: '',
          contractStartDate: '',
          contractEndDate: '',
          securityDeposit: '0',
          monthlyRent: '0',
          isActive: true,
          notes: '',
        });
      }
      setError(null);
    }
  }, [customer, open]);

  const loadAvailableRooms = async () => {
    try {
      const response = await roomService.getAvailableRooms();
      if (response.success && response.data) {
        setAvailableRooms(response.data);
      }
    } catch (err) {
      console.error('Failed to load available rooms:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const requestData: CreateCustomerRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth || undefined,
        identificationNumber: formData.identificationNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        notes: formData.notes,
      };

      let response;
      if (customer) {
        // isActive chỉ có trên UpdateCustomerRequest, không có khi tạo mới
        const updateData: UpdateCustomerRequest = { ...requestData, isActive: formData.isActive };
        response = await customerService.updateCustomer(String(customer.id), updateData);
      } else {
        response = await customerService.createCustomer(requestData);
      }

      if (response.success) {
        // If room is assigned and this is a new customer or room changed, assign to room
        if (formData.roomId && response.data) {
          const customerId = customer?.id || response.data.id;
          const currentRoomId = customer?.room?.id;
          
          // Only assign room if contract dates are provided
          if (customerId && (!currentRoomId || currentRoomId !== formData.roomId)) {
            // Validate that contract dates are provided when assigning a room
            if (!formData.contractStartDate || !formData.contractEndDate) {
              setError('Contract start date and end date are required when assigning a room');
              setIsSubmitting(false);
              return;
            }
            
            // Validate that monthlyRent is a valid positive number
            const rentAmount = parseDecimalInput(formData.monthlyRent);
            if (rentAmount === null || rentAmount <= 0) {
              setError('Monthly rent must be a valid positive number when assigning a room');
              setIsSubmitting(false);
              return;
            }
            
            try {
              // Tiền thuê và tiền cọc thuộc về hợp đồng, gửi kèm khi mở hợp đồng
              await customerService.assignRoom(String(customerId), {
                roomId: parseInt(formData.roomId),
                contractStartDate: formData.contractStartDate,
                contractEndDate: formData.contractEndDate,
                monthlyRent: rentAmount,
                securityDeposit: parseDecimalInput(formData.securityDeposit) ?? 0,
              });
            } catch (err) {
              console.error('Failed to assign room:', err);
              setError(err instanceof Error ? err.message : 'Failed to assign room');
              setIsSubmitting(false);
              return;
            }
          }
        }
        
        onSuccess();
        onOpenChange(false);
      } else {
        setError(response.message || 'Failed to save customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {customer ? t('customers.editCustomer', 'Edit Customer') : t('customers.addCustomer', 'Add Customer')}
          </DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('users.personalInformation', 'Personal Information')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.firstName', 'First name')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder={t('users.firstNamePlaceholder', 'e.g. An')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.lastName', 'Last name')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder={t('users.lastNamePlaceholder', 'e.g. Nguyen Van')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.email', 'Email Address')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('users.emailPlaceholder', 'name@example.com')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.phoneNumber', 'Phone number')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    placeholder={t('users.phonePlaceholder', '09xxxxxxxx')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('customers.dateOfBirth', 'Date of birth')}
                  </label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('customers.idNumber', 'ID / passport number')}
                  </label>
                  <Input
                    value={formData.identificationNumber}
                    onChange={(e) => handleChange('identificationNumber', e.target.value)}
                    placeholder={t('customers.idNumber', 'ID / passport number')}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('customers.emergencyContact', 'Emergency contact')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('customers.contactName', 'Contact name')}
                  </label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    placeholder={t('customers.contactName', 'Contact name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('customers.contactPhone', 'Contact phone')}
                  </label>
                  <Input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                    placeholder={t('customers.contactPhone', 'Contact phone')}
                  />
                </div>
              </div>
            </div>

            {/* Rental Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('customers.rentalInformation', 'Rental Information')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('customers.assignRoom', 'Assign a room')}
                  </label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => handleChange('roomId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('customers.noRoomAssigned', 'No room assigned')}</option>
                    {/* Show currently assigned room first if editing */}
                    {customer?.room && (
                      <option value={customer.room.id}>
                        Room {customer.room.roomNumber} - {customer.room.typeName} (${customer.room.monthlyRent}/mo) [Current]
                      </option>
                    )}
                    {/* Show available rooms */}
                    {availableRooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} - {room.typeName || 'N/A'} (${room.monthlyRent}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('rooms.price', 'Monthly Rent')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) => handleChange('monthlyRent', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contracts.startDate', 'Start date')}
                  </label>
                  <Input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => handleChange('contractStartDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contracts.endDate', 'End date')}
                  </label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => handleChange('contractEndDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contracts.securityDeposit', 'Deposit')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.securityDeposit}
                    onChange={(e) => handleChange('securityDeposit', e.target.value)}
                    placeholder="0"
                  />
                </div>

                {customer && (
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleChange('isActive', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('customers.activeCustomer', 'Active customer')}</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.notes', 'Notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('customers.notesPlaceholder', 'Notes about this customer...')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : customer
                  ? t('common.update', 'Update')
                  : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
