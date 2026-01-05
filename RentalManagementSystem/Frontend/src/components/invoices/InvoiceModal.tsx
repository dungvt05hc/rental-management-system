import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Home, FileText, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardContent } from '../ui';
import { tenantService, roomService, invoiceService } from '../../services';
import { formatCurrency } from '../../utils';
import type { 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest, 
  Invoice, 
  Tenant, 
  Room, 
  ApiResponse 
} from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null;
}

interface FormData {
  tenantId: string;
  roomId: string;
  amount: number;
  dueDate: string;
  description: string;
}

interface FormErrors {
  tenantId?: string;
  roomId?: string;
  amount?: string;
  dueDate?: string;
  description?: string;
  submit?: string;
}

export function InvoiceModal({ isOpen, onClose, onSuccess, invoice }: InvoiceModalProps) {
  const [formData, setFormData] = useState<FormData>({
    tenantId: '',
    roomId: '',
    amount: 0,
    dueDate: '',
    description: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const isEditMode = !!invoice;

  // Initialize form data when modal opens or invoice changes
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setFormData({
          tenantId: invoice.tenantId,
          roomId: invoice.roomId,
          amount: invoice.amount,
          dueDate: invoice.dueDate.split('T')[0], // Format for date input
          description: invoice.description || ''
        });
      } else {
        // Reset form for create mode
        setFormData({
          tenantId: '',
          roomId: '',
          amount: 0,
          dueDate: '',
          description: ''
        });
      }
      setErrors({});
      loadTenants();
      loadRooms();
    }
  }, [isOpen, invoice]);

  // Load selected tenant details when tenantId changes
  useEffect(() => {
    if (formData.tenantId) {
      const tenant = tenants.find(t => t.id === formData.tenantId);
      setSelectedTenant(tenant || null);
      
      // Auto-fill room if tenant has an assigned room
      if (tenant?.roomId && !formData.roomId) {
        setFormData(prev => ({ ...prev, roomId: tenant.roomId! }));
      }
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId, tenants]);

  // Load selected room details when roomId changes
  useEffect(() => {
    if (formData.roomId) {
      const room = rooms.find(r => r.id === formData.roomId);
      setSelectedRoom(room || null);
      
      // Auto-fill amount with room's monthly rent if not set
      if (room?.monthlyRent && formData.amount === 0) {
        setFormData(prev => ({ ...prev, amount: room.monthlyRent }));
      }
    } else {
      setSelectedRoom(null);
    }
  }, [formData.roomId, rooms]);

  const loadTenants = async () => {
    try {
      const response = await tenantService.getActiveTenants();
      if (response.success && response.data) {
        setTenants(response.data);
      } else {
        setTenants([]); // Ensure empty array on failure
        console.error('Failed to load tenants:', response.message);
      }
    } catch (error) {
      setTenants([]); // Ensure empty array on error
      console.error('Failed to load tenants:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await roomService.getRooms();
      if (response.success && response.data) {
        setRooms(response.data.data || []); // Ensure array even if data.data is undefined
      } else {
        setRooms([]); // Ensure empty array on failure
        console.error('Failed to load rooms:', response.message);
      }
    } catch (error) {
      setRooms([]); // Ensure empty array on error
      console.error('Failed to load rooms:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tenantId.trim()) {
      newErrors.tenantId = 'Please select a tenant';
    }

    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Please select a room';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Please select a due date';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      let response: ApiResponse<Invoice>;

      if (isEditMode && invoice) {
        const updateData: UpdateInvoiceRequest = {
          tenantId: formData.tenantId,
          roomId: formData.roomId,
          amount: formData.amount,
          dueDate: formData.dueDate,
          description: formData.description || undefined
        };
        response = await invoiceService.updateInvoice(invoice.id, updateData);
      } else {
        const createData: CreateInvoiceRequest = {
          tenantId: formData.tenantId,
          roomId: formData.roomId,
          amount: formData.amount,
          dueDate: formData.dueDate,
          description: formData.description || undefined
        };
        response = await invoiceService.createInvoice(createData);
      }

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setErrors({ submit: response.message || 'Failed to save invoice' });
      }
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'amount' ? parseFloat(e.target.value) || 0 : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditMode ? 'Update invoice details' : 'Create a new invoice for rent collection'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tenant Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="inline h-4 w-4 mr-1" />
              Tenant *
            </label>
            <select
              value={formData.tenantId}
              onChange={handleInputChange('tenantId')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.tenantId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Select a tenant</option>
              {(tenants || []).map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.firstName} {tenant.lastName} - {tenant.email}
                </option>
              ))}
            </select>
            {errors.tenantId && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.tenantId}
              </p>
            )}
            {selectedTenant && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm text-gray-600">
                    <p><strong>Phone:</strong> {selectedTenant.phoneNumber}</p>
                    <p><strong>Status:</strong> {selectedTenant.status}</p>
                    {selectedTenant.room && (
                      <p><strong>Current Room:</strong> {selectedTenant.room.roomNumber}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Room Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Home className="inline h-4 w-4 mr-1" />
              Room *
            </label>
            <select
              value={formData.roomId}
              onChange={handleInputChange('roomId')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.roomId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Select a room</option>
              {(rooms || []).map(room => (
                <option key={room.id} value={room.id}>
                  Room {room.roomNumber} - {formatCurrency(room.monthlyRent)}/month
                </option>
              ))}
            </select>
            {errors.roomId && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.roomId}
              </p>
            )}
            {selectedRoom && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm text-gray-600">
                    <p><strong>Monthly Rent:</strong> {formatCurrency(selectedRoom.monthlyRent)}</p>
                    <p><strong>Status:</strong> {selectedRoom.status}</p>
                    {selectedRoom.description && (
                      <p><strong>Description:</strong> {selectedRoom.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Amount *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ''}
              onChange={handleInputChange('amount')}
              placeholder="Enter invoice amount"
              className={errors.amount ? 'border-red-300' : ''}
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.amount}
              </p>
            )}
            {selectedRoom && formData.amount !== selectedRoom.monthlyRent && (
              <p className="text-sm text-blue-600">
                Room monthly rent: {formatCurrency(selectedRoom.monthlyRent)}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="inline h-4 w-4 mr-1" />
              Due Date *
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange('dueDate')}
              className={errors.dueDate ? 'border-red-300' : ''}
              disabled={isLoading}
            />
            {errors.dueDate && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dueDate}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Enter invoice description (optional)"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formData.description.length}/1000 characters</span>
              {errors.description && (
                <span className="text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </span>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>{isEditMode ? 'Update Invoice' : 'Create Invoice'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}