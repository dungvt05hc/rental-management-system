import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, Button, Input } from '../ui';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { invoiceService, tenantService, roomService } from '../../services';
import type { Invoice, CreateInvoiceRequest, UpdateInvoiceRequest, Tenant, Room, InvoiceItem } from '../../types';

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'Pending', label: 'Pending', color: 'yellow' },
  { value: 'Paid', label: 'Paid', color: 'green' },
  { value: 'Overdue', label: 'Overdue', color: 'red' },
  { value: 'Cancelled', label: 'Cancelled', color: 'gray' },
];

export function InvoiceDialog({ open, onOpenChange, invoice, onSuccess }: InvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    tenantId: '',
    roomId: '',
    billingPeriod: '',
    monthlyRent: '0',
    additionalCharges: '0',
    discount: '0',
    dueDate: '',
    status: 'Pending',
    additionalChargesDescription: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadTenants();
      loadRooms();
      
      if (invoice) {
        const invoiceData = invoice as any;
        setFormData({
          tenantId: String(invoiceData.tenant?.id || invoiceData.tenantId || ''),
          roomId: String(invoiceData.room?.id || invoiceData.roomId || ''),
          billingPeriod: invoiceData.billingPeriod ? invoiceData.billingPeriod.split('T')[0] : '',
          monthlyRent: String(invoiceData.monthlyRent || 0),
          additionalCharges: String(invoiceData.additionalCharges || 0),
          discount: String(invoiceData.discount || 0),
          dueDate: invoiceData.dueDate ? invoiceData.dueDate.split('T')[0] : '',
          status: invoiceData.statusName || invoiceData.status || 'Pending',
          additionalChargesDescription: invoiceData.additionalChargesDescription || '',
          notes: invoiceData.notes || '',
        });
        
        // Load invoice items if available
        setInvoiceItems(invoiceData.invoiceItems || []);
      } else {
        // Set default values for new invoice
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
        
        setFormData({
          tenantId: '',
          roomId: '',
          billingPeriod: nextMonth.toISOString().split('T')[0],
          monthlyRent: '0',
          additionalCharges: '0',
          discount: '0',
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'Pending',
          additionalChargesDescription: '',
          notes: '',
        });
        setInvoiceItems([]);
      }
      setError(null);
    }
  }, [invoice, open]);

  const loadTenants = async () => {
    try {
      const response = await tenantService.getTenants({ pageSize: 1000 });
      if (response.success && response.data) {
        const data = response.data as any;
        setTenants(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await roomService.getRooms({ pageSize: 1000 });
      if (response.success && response.data) {
        const data = response.data as any;
        setRooms(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => String(t.id) === tenantId);
    
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        tenantId,
        roomId: tenant.roomId ? String(tenant.roomId) : prev.roomId,
        monthlyRent: tenant.monthlyRent ? String(tenant.monthlyRent) : prev.monthlyRent,
      }));
    } else {
      setFormData(prev => ({ ...prev, tenantId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (invoice) {
        // Update existing invoice
        const updateData: any = {
          additionalCharges: parseFloat(formData.additionalCharges),
          discount: parseFloat(formData.discount),
          status: formData.status,
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems,
        };

        const response = await invoiceService.updateInvoice(String(invoice.id), updateData as UpdateInvoiceRequest);
        
        if (response.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(response.message || 'Failed to update invoice');
        }
      } else {
        // Create new invoice
        const createData: any = {
          tenantId: parseInt(formData.tenantId),
          roomId: parseInt(formData.roomId),
          billingPeriod: formData.billingPeriod,
          additionalCharges: parseFloat(formData.additionalCharges),
          discount: parseFloat(formData.discount),
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems,
        };

        const response = await invoiceService.createInvoice(createData as CreateInvoiceRequest);
        
        if (response.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(response.message || 'Failed to create invoice');
        }
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

  const calculateTotal = () => {
    const monthly = parseFloat(formData.monthlyRent) || 0;
    const additional = parseFloat(formData.additionalCharges) || 0;
    const discount = parseFloat(formData.discount) || 0;
    
    // Add invoice items total
    const itemsTotal = invoiceItems.reduce((sum, item) => sum + item.lineTotalWithTax, 0);
    
    return monthly + additional + itemsTotal - discount;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Billing Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</span>
                Billing Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tenantId}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!invoice}
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {(tenant as any).fullName || `${tenant.firstName} ${tenant.lastName}`}
                        {tenant.room && ` - Room ${tenant.room.roomNumber}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => handleChange('roomId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!invoice}
                  >
                    <option value="">Select Room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} - ${room.monthlyRent}/mo
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Period <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.billingPeriod}
                    onChange={(e) => handleChange('billingPeriod', e.target.value)}
                    required
                    disabled={!!invoice}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    required
                  />
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
                    disabled={!!invoice}
                  />
                </div>

                {invoice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items Table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">2</span>
                Invoice Line Items
              </h3>
              <InvoiceItemsTable
                items={invoiceItems}
                onChange={setInvoiceItems}
                disabled={isSubmitting}
              />
            </div>

            {/* Additional Charges & Discounts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">3</span>
                Additional Charges & Discounts
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Charges ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.additionalCharges}
                      onChange={(e) => handleChange('additionalCharges', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => handleChange('discount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {parseFloat(formData.additionalCharges) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Charges Description
                    </label>
                    <textarea
                      value={formData.additionalChargesDescription}
                      onChange={(e) => handleChange('additionalChargesDescription', e.target.value)}
                      placeholder="e.g., Utilities, Maintenance, Late fees..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Total Amount Display */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Monthly Rent:</span>
                      <span className="font-medium">${parseFloat(formData.monthlyRent || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Invoice Items Total:</span>
                      <span className="font-medium">${invoiceItems.reduce((sum, item) => sum + item.lineTotalWithTax, 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(formData.additionalCharges) > 0 && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Additional Charges:</span>
                        <span className="font-medium">+${parseFloat(formData.additionalCharges).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(formData.discount) > 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Discount:</span>
                        <span className="font-medium">-${parseFloat(formData.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-blue-300 pt-2 mt-2 flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Invoice Grand Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">4</span>
                Notes
              </h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this invoice..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="border-t bg-gray-50 px-6 py-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-blue-700">
              {isSubmitting ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
