import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, NumericInput, AlertDialog } from '../ui';
import { invoiceService, customerService, roomService, itemService } from '../../services';
import type { CreateInvoiceRequest, UpdateInvoiceRequest, Customer, Room, InvoiceItem, Item, InvoiceStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  calculateItemTotals,
  calculateInvoiceItemsTotals,
  roundToCents,
} from './invoiceItemCalculations';
import { formatCurrency, parseDecimalInput } from '../../utils';
import { defineMessage } from '../../utils/i18n';

const statusOptions = [
  { value: 1, message: defineMessage('invoices.statusDraft', 'Draft'), color: 'gray' },
  { value: 2, message: defineMessage('invoices.statusIssued', 'Issued'), color: 'blue' },
  { value: 3, message: defineMessage('invoices.unpaid', 'Pending'), color: 'yellow' },
  { value: 4, message: defineMessage('invoices.partiallyPaid', 'Partially Paid'), color: 'orange' },
  { value: 5, message: defineMessage('invoices.paid', 'Paid'), color: 'green' },
  { value: 6, message: defineMessage('invoices.overdue', 'Overdue'), color: 'red' },
  { value: 7, message: defineMessage('invoices.cancelled', 'Cancelled'), color: 'gray' },
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
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    roomId: '',
    billingPeriod: '',
    additionalCharges: '0',
    discount: '0',
    dueDate: '',
    status: 'Pending',
    additionalChargesDescription: '',
    notes: '',
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemIndex: number | null;
    itemName: string;
  }>({
    open: false,
    itemIndex: null,
    itemName: '',
  });

  useEffect(() => {
    loadCustomers();
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
        const invoiceData = response.data;
        setFormData({
          customerId: String(invoiceData.customer?.id || invoiceData.customerId || ''),
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

  const loadCustomers = async () => {
    try {
      const response = await customerService.getCustomers({ pageSize: 1000 });
      if (response.success && response.data) {
        setCustomers(response.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await roomService.getRooms({ pageSize: 1000 });
      if (response.success && response.data) {
        setRooms(response.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const loadItems = async () => {
    try {
      const response = await itemService.getItems({ pageSize: 1000, isActive: true });
      if (response.success && response.data) {
        setItems(response.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(t => String(t.id) === customerId);

    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId,
        roomId: customer.room?.id ? String(customer.room.id) : prev.roomId,
      }));
    } else {
      setFormData(prev => ({ ...prev, customerId }));
    }
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

  const handleEditItem = <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => {
    const newItems = [...invoiceItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    newItems[index] = calculateItemTotals(newItems[index]);

    setInvoiceItems(newItems);
  };

  const handleDeleteItem = (index: number, itemName: string) => {
    setConfirmDialog({
      open: true,
      itemIndex: index,
      itemName,
    });
  };

  const confirmDeleteItem = () => {
    if (confirmDialog.itemIndex === null) return;
    const newItems = invoiceItems.filter((_, i) => i !== confirmDialog.itemIndex);
    const renumberedItems = newItems.map((item, i) => ({
      ...item,
      lineNumber: i + 1,
    }));
    setInvoiceItems(renumberedItems);
    setConfirmDialog({ open: false, itemIndex: null, itemName: '' });
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
        const updateData: UpdateInvoiceRequest = {
          additionalCharges: (parseDecimalInput(formData.additionalCharges) ?? 0),
          discount: (parseDecimalInput(formData.discount) ?? 0),
          status: parseInt(formData.status) as InvoiceStatus,
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems: validItems,
        };

        const response = await invoiceService.updateInvoice(id, updateData);

        if (response.success) {
          showSuccess(t('common.success', 'Success'), t('invoices.updateSuccess', 'Invoice updated successfully'));
          navigate('/invoices');
        } else {
          showError(t('common.error', 'Error'), response.message || t('invoices.updateError', 'Failed to update invoice'));
        }
      } else {
        const createData: CreateInvoiceRequest = {
          customerId: parseInt(formData.customerId),
          roomId: parseInt(formData.roomId),
          billingPeriod: formData.billingPeriod,
          additionalCharges: (parseDecimalInput(formData.additionalCharges) ?? 0),
          discount: (parseDecimalInput(formData.discount) ?? 0),
          dueDate: formData.dueDate,
          additionalChargesDescription: formData.additionalChargesDescription,
          notes: formData.notes,
          invoiceItems: validItems,
        };

        const response = await invoiceService.createInvoice(createData);

        if (response.success) {
          showSuccess(t('common.success', 'Success'), t('invoices.createSuccess', 'Invoice created successfully'));
          navigate('/invoices');
        } else {
          showError(t('common.error', 'Error'), response.message || t('invoices.createError', 'Failed to create invoice'));
        }
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const itemsTotals = calculateInvoiceItemsTotals(invoiceItems);

  // Same expression the backend applies when it recalculates the invoice, so the
  // figure previewed here is the one that gets stored.
  const calculateTotal = () => {
    const additional = parseDecimalInput(formData.additionalCharges) ?? 0;
    const discount = parseDecimalInput(formData.discount) ?? 0;

    return roundToCents(itemsTotals.total + additional - discount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">{t('invoices.loadingOne', 'Loading invoice...')}</p>
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
            <span>{t('invoices.backToList', 'Back to invoices')}</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? t('invoices.editInvoice', 'Edit Invoice') : t('invoices.createInvoice', 'Create Invoice')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode
                ? t('invoices.editSubtitle', 'Change the invoice details and its line items')
                : t('invoices.createSubtitle', 'Fill in the details below to raise a new invoice')}
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
              {t('invoices.billingInformation', 'Billing Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoices.customer', 'Customer')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isEditMode}
                >
                  <option value="">{t('invoices.selectCustomer', 'Select a customer')}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                      {customer.room && ` - ${t('rooms.roomLabel', 'Room {number}', { number: customer.room.roomNumber })}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contracts.room', 'Room')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => handleChange('roomId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isEditMode}
                >
                  <option value="">{t('contracts.selectRoom', 'Select a room')}</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })} — {t('rooms.perMonth', '{amount}/month', { amount: formatCurrency(room.monthlyRent) })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoices.billingPeriod', 'Billing Period')} <span className="text-red-500">*</span>
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
                  {t('invoices.dueDate', 'Due Date')} <span className="text-red-500">*</span>
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
                    {t('rooms.status', 'Status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {t(option.message.key, option.message.defaultValue)}
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
                {t('invoices.lineItems', 'Invoice Line Items')}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMultipleItems}
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-300 text-green-700"
              >
                <Plus className="h-4 w-4" />
                <span>{t('invoices.addItem', 'Add Item')}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">{t('items.itemCode', 'Item Code')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[180px]">{t('items.itemName', 'Item Name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[150px]">{t('items.description', 'Description')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">{t('invoices.quantityShort', 'Qty')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 w-20">{t('invoices.unitShort', 'Unit')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-28">{t('items.unitPrice', 'Unit Price')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">{t('invoices.discountPercentShort', 'Disc %')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-24">{t('items.taxPercent', 'Tax %')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 w-32">{t('invoices.lineTotal', 'Line Total')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-16">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center">
                        <div className="text-gray-500">
                          <p className="text-base font-medium mb-2">{t('invoices.noItemsYet', 'No line items yet')}</p>
                          <p className="text-sm">{t('invoices.noItemsHint', 'Use the Add Item button to put lines on this invoice')}</p>
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
                            <option value="">{t('invoices.selectItem', 'Select an item')}</option>
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
                            placeholder={t('items.itemName', 'Item Name')}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={item.description || ''}
                            onChange={(e) => handleEditItem(index, 'description', e.target.value)}
                            className="h-9 text-sm"
                            placeholder={t('items.description', 'Description')}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <NumericInput
                            value={item.quantity}
                            onValueChange={(value) => handleEditItem(index, 'quantity', value ?? 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            list="uom-options-form"
                            value={item.unitOfMeasure}
                            onChange={(e) => handleEditItem(index, 'unitOfMeasure', e.target.value)}
                            className="h-9 text-sm border border-gray-300 rounded px-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('invoices.unitShort', 'Unit')}
                          />
                          <datalist id="uom-options-form">
                            <option value="pcs">pcs</option>
                            <option value="pc">pc</option>
                            <option value="piece">piece</option>
                            <option value="kg">kg</option>
                            <option value="gram">gram</option>
                            <option value="ton">ton</option>
                            <option value="m">m</option>
                            <option value="cm">cm</option>
                            <option value="km">km</option>
                            <option value="sqm">sqm (square meter)</option>
                            <option value="hrs">hrs</option>
                            <option value="hour">hour</option>
                            <option value="day">day</option>
                            <option value="days">days</option>
                            <option value="week">week</option>
                            <option value="weeks">weeks</option>
                            <option value="month">month</option>
                            <option value="months">months</option>
                            <option value="year">year</option>
                            <option value="years">years</option>
                            <option value="unit">unit</option>
                            <option value="box">box</option>
                            <option value="package">package</option>
                            <option value="set">set</option>
                            <option value="liter">liter</option>
                            <option value="gallon">gallon</option>
                          </datalist>
                        </td>
                        <td className="px-4 py-3">
                          <NumericInput
                            value={item.unitPrice}
                            onValueChange={(value) => handleEditItem(index, 'unitPrice', value ?? 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <NumericInput
                            value={item.discountPercent}
                            onValueChange={(value) => handleEditItem(index, 'discountPercent', value ?? 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <NumericInput
                            value={item.taxPercent}
                            onValueChange={(value) => handleEditItem(index, 'taxPercent', value ?? 0)}
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(item.lineTotalWithTax)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteItem(index, item.itemName)}
                            disabled={isSubmitting}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={t('common.delete', 'Delete')}
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
                        {t('invoices.subtotal', 'Subtotal')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(itemsTotals.afterDiscount)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-right font-semibold text-gray-700">
                        {t('invoices.totalTax', 'Total tax')}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        {formatCurrency(itemsTotals.tax)}
                      </td>
                      <td></td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td colSpan={9} className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                        {t('invoices.itemsTotal', 'Line items total')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">
                        {formatCurrency(itemsTotals.total)}
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
              {t('invoices.chargesAndDiscounts', 'Additional charges and discounts')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoices.additionalCharges', 'Additional Charges')}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.additionalCharges}
                  onChange={(e) => handleChange('additionalCharges', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoices.discount', 'Discount')}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.discount}
                  onChange={(e) => handleChange('discount', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {(parseDecimalInput(formData.additionalCharges) ?? 0) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoices.additionalChargesDescription', 'What the additional charges are for')}
                </label>
                <textarea
                  value={formData.additionalChargesDescription}
                  onChange={(e) => handleChange('additionalChargesDescription', e.target.value)}
                  placeholder={t('invoices.additionalChargesPlaceholder', 'e.g. utilities, repairs, late fee...')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm opacity-90">
                  <span>{t('invoices.itemsTotal', 'Line items total')}</span>
                  <span className="font-medium">{formatCurrency(itemsTotals.total)}</span>
                </div>
                {(parseDecimalInput(formData.additionalCharges) ?? 0) > 0 && (
                  <div className="flex justify-between text-sm opacity-90">
                    <span>{t('invoices.additionalCharges', 'Additional Charges')}</span>
                    <span className="font-medium">+{formatCurrency((parseDecimalInput(formData.additionalCharges) ?? 0))}</span>
                  </div>
                )}
                {(parseDecimalInput(formData.discount) ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-yellow-200">
                    <span>{t('invoices.discount', 'Discount')}</span>
                    <span className="font-medium">-{formatCurrency((parseDecimalInput(formData.discount) ?? 0))}</span>
                  </div>
                )}
                <div className="border-t-2 border-white border-opacity-30 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-xl font-bold">{t('invoices.grandTotal', 'Invoice grand total')}</span>
                  <span className="text-3xl font-bold">
                    {formatCurrency(calculateTotal())}
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
              {t('common.notes', 'Notes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={t('invoices.notesPlaceholder', 'Notes about this invoice...')}
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
                <span>{t('common.cancel', 'Cancel')}</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8"
              >
                <Save className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? t('common.saving', 'Saving...')
                    : isEditMode
                      ? t('invoices.updateInvoice', 'Update Invoice')
                      : t('invoices.createInvoice', 'Create Invoice')}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, itemIndex: null, itemName: '' })
        }
        title={t('invoices.deleteItemTitle', 'Delete Item')}
        description={t(
          'invoices.deleteItemMessage',
          'Remove "{name}" from this invoice?',
          { name: confirmDialog.itemName }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteItem}
        variant="warning"
      />
    </div>
  );
}