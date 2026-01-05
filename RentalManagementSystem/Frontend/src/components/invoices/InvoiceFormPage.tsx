import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../ui';
import { invoiceService, tenantService, roomService, itemService } from '../../services';
import type { CreateInvoiceRequest, UpdateInvoiceRequest, Tenant, Room, InvoiceItem, Item, InvoiceStatus } from '../../types';

const statusOptions = [
  { value: 1, label: 'Draft', color: 'gray' },
  { value: 2, label: 'Issued', color: 'blue' },
  { value: 3, label: 'Unpaid', color: 'yellow' },
  { value: 4, label: 'Partially Paid', color: 'orange' },
  { value: 5, label: 'Paid', color: 'green' },
  { value: 6, label: 'Overdue', color: 'red' },
  { value: 7, label: 'Cancelled', color: 'gray' },
];

const defaultItem: InvoiceItem = {
  itemCode: '',
  itemName: '',
  description: '',
  quantity: 1,
  unitOfMeasure: 'pcs',
  unitPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  lineTotal: 0,
  lineTotalWithTax: 0,
  lineNumber: 1,
  category: '',
  notes: '',
};

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    tenantId: '',
    roomId: '',
    billingPeriod: '',
    additionalCharges: '0',
    discount: '0',
    dueDate: '',
    status: 'Pending',
    additionalChargesDescription: '',
    notes: '',
  });

  useEffect(() => {
    loadTenants();
    loadRooms();
    loadItems();

    if (isEditMode && id) {
      loadInvoice(id);
    } else {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);

      setFormData(prev => ({
        ...prev,
        billingPeriod: nextMonth.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
      }));
    }
  }, [id, isEditMode]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const response = await invoiceService.getInvoice(invoiceId);

      if (response.success && response.data) {
        const invoiceData = response.data as any;
        setFormData({
          tenantId: String(invoiceData.tenant?.id || invoiceData.tenantId || ''),
          roomId: String(invoiceData.room?.id || invoiceData.roomId || ''),
          billingPeriod: invoiceData.billingPeriod ? invoiceData.billingPeriod.split('T')[0] : '',
          additionalCharges: String(invoiceData.additionalCharges || 0),
          discount: String(invoiceData.discount || 0),
          dueDate: invoiceData.dueDate ? invoiceData.dueDate.split('T')[0] : '',
          status: String(invoiceData.status || 2), // Use numeric status value
          additionalChargesDescription: invoiceData.additionalChargesDescription || '',
          notes: invoiceData.notes || '',
        });

        setInvoiceItems(invoiceData.invoiceItems || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

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

  const loadItems = async () => {
    try {
      const response = await itemService.getItems({ pageSize: 1000, isActive: true });
      if (response.success && response.data) {
        const data = response.data as any;
        setItems(data.items || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    const tenant = tenants.find(t => String(t.id) === tenantId);

    if (tenant) {
      setFormData(prev => ({
        ...prev,
        tenantId,
        roomId: tenant.room?.id ? String(tenant.room.id) : prev.roomId,
      }));
    } else {
      setFormData(prev => ({ ...prev, tenantId }));
    }
  };

  const calculateItemTotals = (item: InvoiceItem): InvoiceItem => {
    const subtotal = item.quantity * item.unitPrice;

    let discountAmount = item.discountAmount;
    if (item.discountPercent > 0) {
      discountAmount = (subtotal * item.discountPercent) / 100;
    }

    const lineTotal = subtotal - discountAmount;
    const taxAmount = (lineTotal * item.taxPercent) / 100;
    const lineTotalWithTax = lineTotal + taxAmount;

    return {
      ...item,
      discountAmount,
      taxAmount,
      lineTotal,
      lineTotalWithTax,
    };
  };

  const handleAddMultipleItems = () => {
    const newItem: InvoiceItem = {
      ...defaultItem,
      lineNumber: invoiceItems.length + 1,
    };

    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find(item => String(item.id) === itemId);

    if (selectedItem) {
      const newItems = [...invoiceItems];
      newItems[index] = {
        ...newItems[index],
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        description: selectedItem.description || '',
        unitOfMeasure: selectedItem.unitOfMeasure,
        unitPrice: selectedItem.unitPrice,
        taxPercent: selectedItem.taxPercent || 0,
        category: selectedItem.category || '',
      };

      newItems[index] = calculateItemTotals(newItems[index]);

      setInvoiceItems(newItems);
    }
  };

  const handleEditItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    newItems[index] = calculateItemTotals(newItems[index]);

    setInvoiceItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const newItems = invoiceItems.filter((_, i) => i !== index);
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        lineNumber: i + 1,
      }));
      setInvoiceItems(renumberedItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const validItems = invoiceItems.filter(item =>
        item.itemCode.trim() !== '' || item.itemName.trim() !== ''
      );

      if (isEditMode && id) {
        // For update, send all editable fields including invoiceItems
        const updateData: any = {
          additionalCharges: parseFloat(formData.additionalCharges),
          discount: parseFloat(formData.discount),
          status: parseInt(formData.status) as InvoiceStatus,
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems: validItems, // Include invoice items in update
        };

        const response = await invoiceService.updateInvoice(id, updateData);

        if (response.success) {
          navigate('/invoices');
        } else {
          setError(response.message || 'Failed to update invoice');
        }
      } else {
        const createData: any = {
          tenantId: parseInt(formData.tenantId),
          roomId: parseInt(formData.roomId),
          billingPeriod: formData.billingPeriod,
          additionalCharges: parseFloat(formData.additionalCharges),
          discount: parseFloat(formData.discount),
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems: validItems,
        };

        const response = await invoiceService.createInvoice(createData as CreateInvoiceRequest);

        if (response.success) {
          navigate('/invoices');
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
    const additional = parseFloat(formData.additionalCharges) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const itemsTotal = invoiceItems.reduce((sum, item) => sum + item.lineTotalWithTax, 0);

    return additional + itemsTotal - discount;
  };

  const itemsTotals = invoiceItems.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.lineTotal,
      tax: acc.tax + item.taxAmount,
      total: acc.total + item.lineTotalWithTax,
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/invoices')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Invoices</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? 'Update invoice details and line items' : 'Fill in the details below to create a new invoice'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">1</span>
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isEditMode}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => handleChange('roomId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isEditMode}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Period <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.billingPeriod}
                  onChange={(e) => handleChange('billingPeriod', e.target.value)}
                  required
                  disabled={isEditMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  required
                />
              </div>

              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">2</span>
                Invoice Line Items
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMultipleItems}
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-300 text-green-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[180px]">Item Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[150px]">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-20">UoM</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-28">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">Disc %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">Tax %</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-32">Line Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center">
                        <div className="text-gray-500">
                          <p className="text-base font-medium mb-2">No items added yet</p>
                          <p className="text-sm">Click "Add Item" to add line items to this invoice</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 font-medium">{item.lineNumber}</td>
                        <td className="px-4 py-3">
                          <select
                            value={items.find(i => i.itemCode === item.itemCode)?.id || ''}
                            onChange={(e) => handleItemSelect(index, e.target.value)}
                            className="w-full h-9 text-sm border border-gray-300 rounded px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Item</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.itemCode} - {i.itemName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={item.itemName}
                            onChange={(e) => handleEditItem(index, 'itemName', e.target.value)}
                            className="h-9 text-sm"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={item.description || ''}
                            onChange={(e) => handleEditItem(index, 'description', e.target.value)}
                            className="h-9 text-sm"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => handleEditItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.unitOfMeasure}
                            onChange={(e) => handleEditItem(index, 'unitOfMeasure', e.target.value)}
                            className="h-9 text-sm border border-gray-300 rounded px-2 w-full"
                          >
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="m">m</option>
                            <option value="hrs">hrs</option>
                            <option value="days">days</option>
                            <option value="months">months</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleEditItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleEditItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.taxPercent}
                            onChange={(e) => handleEditItem(index, 'taxPercent', parseFloat(e.target.value) || 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ${item.lineTotalWithTax.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteItem(index)}
                            disabled={isSubmitting}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {invoiceItems.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={9} className="px-4 py-3 text-right font-semibold text-gray-700">
                        Subtotal:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ${itemsTotals.subtotal.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-right font-semibold text-gray-700">
                        Total Tax:
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        ${itemsTotals.tax.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td colSpan={9} className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                        Items Total:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">
                        ${itemsTotals.total.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">3</span>
              Additional Charges & Discounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Charges Description
                </label>
                <textarea
                  value={formData.additionalChargesDescription}
                  onChange={(e) => handleChange('additionalChargesDescription', e.target.value)}
                  placeholder="e.g., Utilities, Maintenance, Late fees..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm opacity-90">
                  <span>Invoice Items Total:</span>
                  <span className="font-medium">${itemsTotals.total.toFixed(2)}</span>
                </div>
                {parseFloat(formData.additionalCharges) > 0 && (
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Additional Charges:</span>
                    <span className="font-medium">+${parseFloat(formData.additionalCharges).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(formData.discount) > 0 && (
                  <div className="flex justify-between text-sm text-yellow-200">
                    <span>Discount:</span>
                    <span className="font-medium">-${parseFloat(formData.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-white border-opacity-30 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-xl font-bold">Invoice Grand Total:</span>
                  <span className="text-3xl font-bold">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center text-lg">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">4</span>
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this invoice..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/invoices')}
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Create Invoice'}</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}