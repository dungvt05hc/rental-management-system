import { useState, useEffect } from 'react';
import { X, Save, DollarSign, CreditCard, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentService, invoiceService } from '../../services';
import type { Payment, CreatePaymentRequest, UpdatePaymentRequest, Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils';

interface PaymentFormModalProps {
  payment?: Payment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentFormModal({ payment, onClose, onSuccess }: PaymentFormModalProps) {
  const [formData, setFormData] = useState({
    invoiceId: payment?.invoiceId || '',
    amount: payment?.amount || 0,
    paymentDate: payment?.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paymentMethod: payment?.paymentMethod || 'Cash',
    reference: payment?.reference || '',
    notes: payment?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch unpaid invoices for the dropdown
  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices', 'unpaid'],
    queryFn: () => invoiceService.getInvoices({ 
      page: 1, 
      pageSize: 100,
      status: 'Pending'
    }),
  });

  const invoices = invoicesResponse?.data?.items || [];

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentService.createPayment(data),
    onSuccess: () => {
      alert('Payment recorded successfully!');
      onSuccess();
    },
    onError: (error: any) => {
      alert('Failed to record payment: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payment: UpdatePaymentRequest }) => 
      paymentService.updatePayment(data.id, data.payment),
    onSuccess: () => {
      alert('Payment updated successfully!');
      onSuccess();
    },
    onError: (error: any) => {
      alert('Failed to update payment: ' + error.message);
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceId) {
      newErrors.invoiceId = 'Please select an invoice';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const paymentData = {
      invoiceId: Number(formData.invoiceId),
      amount: Number(formData.amount),
      paymentDate: new Date(formData.paymentDate).toISOString(),
      paymentMethod: formData.paymentMethod,
      reference: formData.reference || undefined,
      notes: formData.notes || undefined
    };

    if (payment) {
      updateMutation.mutate({ id: String(payment.id), payment: paymentData });
    } else {
      createMutation.mutate(paymentData);
    }
  };

  const selectedInvoice = invoices.find((inv: Invoice) => String(inv.id) === String(formData.invoiceId));
  const remainingBalance = selectedInvoice ? (selectedInvoice as any).remainingBalance || selectedInvoice.amount : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {payment ? 'Edit Payment' : 'Record New Payment'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {payment ? 'Update payment details' : 'Record a payment transaction'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Selection */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <FileText className="inline h-4 w-4 mr-2" />
              Select Invoice *
            </label>
            <select
              value={formData.invoiceId}
              onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.invoiceId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={!!payment}
            >
              <option value="">-- Select an invoice --</option>
              {invoices.map((invoice: Invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  #{invoice.invoiceNumber} - {invoice.tenant?.firstName} {invoice.tenant?.lastName} - 
                  {formatCurrency((invoice as any).remainingBalance || invoice.amount)} remaining
                </option>
              ))}
            </select>
            {errors.invoiceId && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.invoiceId}
              </p>
            )}
            {selectedInvoice && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-300">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount:</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {formatCurrency(selectedInvoice.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining Balance:</p>
                    <p className="font-bold text-blue-600 text-lg">
                      {formatCurrency(remainingBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Due Date:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedInvoice.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {(selectedInvoice as any).statusName || selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <DollarSign className="inline h-4 w-4 mr-2" />
                Payment Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.amount}
                </p>
              )}
              {selectedInvoice && formData.amount > remainingBalance && (
                <p className="mt-2 text-sm text-amber-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Amount exceeds remaining balance
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Calendar className="inline h-4 w-4 mr-2" />
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
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
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <CreditCard className="inline h-4 w-4 mr-2" />
              Payment Method *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Cash', 'BankTransfer', 'Check', 'CreditCard'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.paymentMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <CreditCard className="h-5 w-5 mx-auto mb-2" />
                  <span className="text-sm font-medium">
                    {method === 'BankTransfer' ? 'Bank Transfer' : 
                     method === 'CreditCard' ? 'Credit Card' : method}
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
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Transaction reference, check number, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about this payment..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>{payment ? 'Update Payment' : 'Record Payment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
