import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, Button, Input } from '../ui';
import { tenantService, roomService } from '../../services';
import type { Tenant, CreateTenantRequest, UpdateTenantRequest, Room } from '../../types';

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSuccess: () => void;
}

export function TenantDialog({ open, onOpenChange, tenant, onSuccess }: TenantDialogProps) {
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
      if (tenant) {
        setFormData({
          firstName: tenant.firstName || '',
          lastName: tenant.lastName || '',
          email: tenant.email || '',
          phoneNumber: tenant.phoneNumber || '',
          dateOfBirth: tenant.dateOfBirth ? tenant.dateOfBirth.split('T')[0] : '',
          identificationNumber: tenant.identificationNumber || '',
          emergencyContactName: tenant.emergencyContactName || '',
          emergencyContactPhone: tenant.emergencyContactPhone || '',
          roomId: tenant.room?.id?.toString() || '',
          contractStartDate: tenant.contractStartDate ? tenant.contractStartDate.split('T')[0] : '',
          contractEndDate: tenant.contractEndDate ? tenant.contractEndDate.split('T')[0] : '',
          securityDeposit: tenant.securityDeposit?.toString() || '0',
          monthlyRent: tenant.monthlyRent?.toString() || '0',
          isActive: tenant.isActive !== undefined ? tenant.isActive : true,
          notes: tenant.notes || '',
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
  }, [tenant, open]);

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
      const requestData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth || undefined,
        identificationNumber: formData.identificationNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        securityDeposit: parseFloat(formData.securityDeposit),
        monthlyRent: parseFloat(formData.monthlyRent),
        notes: formData.notes,
      };

      if (tenant) {
        requestData.isActive = formData.isActive;
      }

      let response;
      if (tenant) {
        response = await tenantService.updateTenant(String(tenant.id), requestData as UpdateTenantRequest);
      } else {
        response = await tenantService.createTenant(requestData as CreateTenantRequest);
      }

      if (response.success) {
        // If room is assigned and this is a new tenant or room changed, assign to room
        if (formData.roomId && response.data) {
          const tenantId = tenant?.id || (response.data as any).id;
          const currentRoomId = tenant?.room?.id;
          if (tenantId && (!currentRoomId || currentRoomId !== formData.roomId)) {
            try {
              await tenantService.assignRoom(String(tenantId), {
                roomId: parseInt(formData.roomId),
                contractStartDate: formData.contractStartDate,
                contractEndDate: formData.contractEndDate,
                monthlyRent: parseFloat(formData.monthlyRent),
              });
            } catch (err) {
              console.error('Failed to assign room:', err);
            }
          }
        }
        
        onSuccess();
        onOpenChange(false);
      } else {
        setError(response.message || 'Failed to save tenant');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    placeholder="+1 234 567 8900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number
                  </label>
                  <Input
                    value={formData.identificationNumber}
                    onChange={(e) => handleChange('identificationNumber', e.target.value)}
                    placeholder="ID/Passport Number"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </div>

            {/* Rental Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Rental Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Room
                  </label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => handleChange('roomId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No room assigned</option>
                    {/* Show currently assigned room first if editing */}
                    {tenant?.room && (
                      <option value={tenant.room.id}>
                        Room {tenant.room.roomNumber} - {tenant.room.typeName} (${tenant.room.monthlyRent}/mo) [Current]
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
                    Monthly Rent ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) => handleChange('monthlyRent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => handleChange('contractStartDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => handleChange('contractEndDate', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.securityDeposit}
                    onChange={(e) => handleChange('securityDeposit', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {tenant && (
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleChange('isActive', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Tenant</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the tenant..."
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
