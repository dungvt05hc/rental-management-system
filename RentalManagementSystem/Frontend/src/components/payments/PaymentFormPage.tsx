import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, DollarSign, Calendar, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../ui';
import { paymentService, invoiceService } from '../../services';
import type { Invoice, PaymentMethod } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils';

export function PaymentFormPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    reference: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInvoices();
    if (isEditMode && id) {
      loadPayment(id);
    }
  }, [id, isEditMode]);

  const loadInvoices = async () => {
    try {
      const response = await invoiceService.getInvoices({
        page: 1,
        pageSize: 100,
        // Don't filter by status - let the backend return all invoices
        // We can filter client-side for invoices with remaining balance
      });
      if (response.success && response.data) {
        const data = response.data as any;
        // Filter for invoices that have a remaining balance
        const unpaidInvoices = (data.items || []).filter((inv: any) => 
          inv.remainingBalance > 0 && inv.status !== 5 // 5 = Paid
        );
        setInvoices(unpaidInvoices);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const loadPayment = async (paymentId: string) => {
    try {
      setIsLoading(true);
      const response = await paymentService.getPayment(paymentId);
      if (response.success && response.data) {
        const payment = response.data;
        setFormData({
          invoiceId: String(payment.invoiceId),
          amount: payment.amount,
          paymentDate: payment.paymentDate.split('T')[0],
          paymentMethod: payment.paymentMethod,
          reference: payment.reference || '',
          notes: payment.notes || '',
        });
      }
    } catch (error) {
      showError(
        t('common.error', 'Error'),
        error instanceof Error ? error.message : t('payments.loadError', 'Failed to load payment')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceId) {
      newErrors.invoiceId = t('payments.invoiceRequired', 'Please select an invoice');
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('payments.amountRequired', 'Amount must be greater than 0');
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = t('payments.dateRequired', 'Payment date is required');
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = t('payments.methodRequired', 'Payment method is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const paymentData = {
        invoiceId: String(formData.invoiceId),
        amount: Number(formData.amount),
        paymentDate: new Date(formData.paymentDate).toISOString(),
        paymentMethod: formData.paymentMethod as PaymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      };

      let response;
      if (isEditMode && id) {
        response = await paymentService.updatePayment(id, paymentData);
      } else {
        response = await paymentService.createPayment(paymentData);
      }

      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          isEditMode
            ? t('payments.updateSuccess', 'Payment updated successfully')
            : t('payments.createSuccess', 'Payment recorded successfully')
        );
        navigate('/payments');
      } else {
        showError(
          t('common.error', 'Error'),
          response.message ||
            (isEditMode
              ? t('payments.updateError', 'Failed to update payment')
              : t('payments.createError', 'Failed to record payment'))
        );
      }
    } catch (error) {
      showError(
        t('common.error', 'Error'),
        error instanceof Error ? error.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => String(inv.id) === String(formData.invoiceId));
  const remainingBalance = selectedInvoice
    ? (selectedInvoice as any).remainingBalance || selectedInvoice.amount
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/payments')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode
                ? t('payments.editPayment', 'Edit Payment')
                : t('payments.recordPayment', 'Record New Payment')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode
                ? t('payments.updatePaymentDetails', 'Update payment transaction details')
                : t('payments.recordPaymentDetails', 'Record a payment transaction for an invoice')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>{t('payments.invoiceInfo', 'Invoice Information')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t('payments.selectInvoice', 'Select Invoice')} *
              </label>
              <select
                value={formData.invoiceId}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceId: e.target.value, amount: 0 })
                }
                disabled={isEditMode}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.invoiceId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{t('payments.selectInvoicePlaceholder', '-- Select an invoice --')}</option>
                {invoices.map((invoice: Invoice) => {
                  const invoiceData = invoice as any;
                  return (
                    <option key={invoice.id} value={invoice.id}>
                      #{invoiceData.invoiceNumber || invoice.id} -{' '}
                      {invoiceData.tenant?.firstName} {invoiceData.tenant?.lastName} -{' '}
                      {formatCurrency(invoiceData.remainingBalance || invoice.amount)} remaining
                    </option>
                  );
                })}
              </select>
              {errors.invoiceId && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.invoiceId}
                </p>
              )}
            </div>

            {selectedInvoice && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{t('invoices.tenant', 'Tenant')}</p>
                    <p className="font-semibold text-gray-900">
                      {(selectedInvoice as any).tenant?.firstName}{' '}
                      {(selectedInvoice as any).tenant?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{t('invoices.totalAmount', 'Total Amount')}</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(selectedInvoice.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{t('payments.remaining', 'Remaining Balance')}</p>
                    <p className="font-semibold text-blue-600 text-lg">
                      {formatCurrency(remainingBalance)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>{t('payments.paymentDetails', 'Payment Details')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('payments.amount', 'Payment Amount')} *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.amount}
                  </p>
                )}
                {selectedInvoice && formData.amount > remainingBalance && (
                  <p className="mt-2 text-sm text-yellow-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {t('payments.amountExceeds', 'Amount exceeds remaining balance')}
                  </p>
                )}
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('payments.date', 'Payment Date')} *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDate: e.target.value })
                    }
                    className={`pl-10 ${errors.paymentDate ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.paymentDate && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.paymentDate}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                <CreditCard className="inline h-4 w-4 mr-2" />
                {t('payments.method', 'Payment Method')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Cash', 'BankTransfer', 'Check', 'CreditCard'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: method })}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.paymentMethod === method
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <CreditCard className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">
                      {method === 'BankTransfer' ? 'Bank Transfer' : method === 'CreditCard' ? 'Credit Card' : method}
                    </span>
                  </button>
                ))}
              </div>
              {errors.paymentMethod && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.paymentMethod}
                </p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t('payments.reference', 'Reference Number')}
              </label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder={t('payments.referencePlaceholder', 'Transaction reference, check number, etc.')}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t('common.notes', 'Notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t('payments.notesPlaceholder', 'Additional notes about this payment...')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/payments')}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? t('common.update', 'Update Payment') : t('payments.recordPayment', 'Record Payment')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
