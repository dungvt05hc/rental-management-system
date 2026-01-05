import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button, Input } from '../ui';
import type { InvoiceItem } from '../../types';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
  disabled?: boolean;
}

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

export function InvoiceItemsTable({ items, onChange, disabled = false }: InvoiceItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  const calculateItemTotals = (item: InvoiceItem): InvoiceItem => {
    const subtotal = item.quantity * item.unitPrice;
    
    // Calculate discount
    let discountAmount = item.discountAmount;
    if (item.discountPercent > 0) {
      discountAmount = (subtotal * item.discountPercent) / 100;
    }
    
    // Calculate line total before tax
    const lineTotal = subtotal - discountAmount;
    
    // Calculate tax
    const taxAmount = (lineTotal * item.taxPercent) / 100;
    
    // Calculate line total with tax
    const lineTotalWithTax = lineTotal + taxAmount;
    
    return {
      ...item,
      discountAmount,
      taxAmount,
      lineTotal,
      lineTotalWithTax,
    };
  };

  const handleAddRow = () => {
    const newItem = calculateItemTotals({
      ...defaultItem,
      lineNumber: items.length + 1,
    });
    onChange([...items, newItem]);
    setEditingIndex(items.length);
    setEditingItem(newItem);
  };

  const handleEditRow = (index: number) => {
    setEditingIndex(index);
    setEditingItem({ ...items[index] });
  };

  const handleSaveRow = () => {
    if (editingItem && editingIndex !== null) {
      const updatedItem = calculateItemTotals(editingItem);
      const newItems = [...items];
      newItems[editingIndex] = updatedItem;
      onChange(newItems);
      setEditingIndex(null);
      setEditingItem(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDeleteRow = (index: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const newItems = items.filter((_, i) => i !== index);
      // Renumber lines
      const renumberedItems = newItems.map((item, i) => ({
        ...item,
        lineNumber: i + 1,
      }));
      onChange(renumberedItems);
    }
  };

  const handleFieldChange = (field: keyof InvoiceItem, value: any) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        [field]: value,
      });
    }
  };

  const totals = items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.lineTotal,
      tax: acc.tax + item.taxAmount,
      total: acc.total + item.lineTotalWithTax,
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Invoice Items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled || editingIndex !== null}
          className="flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-12">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 min-w-[100px]">Item Code</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 min-w-[150px]">Item Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 min-w-[100px]">Description</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-16">UoM</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">Unit Price</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">Disc %</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-20">Tax %</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-24">Line Total</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                    No items added. Click "Add Item" to add line items to this invoice.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {editingIndex === index ? (
                      <>
                        <td className="px-3 py-2 text-gray-700">{item.lineNumber}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={editingItem?.itemCode || ''}
                            onChange={(e) => handleFieldChange('itemCode', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Code"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={editingItem?.itemName || ''}
                            onChange={(e) => handleFieldChange('itemName', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={editingItem?.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={editingItem?.quantity || 0}
                            onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editingItem?.unitOfMeasure || 'pcs'}
                            onChange={(e) => handleFieldChange('unitOfMeasure', e.target.value)}
                            className="h-8 text-xs border border-gray-300 rounded px-2"
                          >
                            <option value="pcs">pcs</option>
                            <option value="kg">kg</option>
                            <option value="m">m</option>
                            <option value="hrs">hrs</option>
                            <option value="days">days</option>
                            <option value="months">months</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editingItem?.unitPrice || 0}
                            onChange={(e) => handleFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editingItem?.discountPercent || 0}
                            onChange={(e) => handleFieldChange('discountPercent', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editingItem?.taxPercent || 0}
                            onChange={(e) => handleFieldChange('taxPercent', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          ${calculateItemTotals(editingItem!).lineTotalWithTax.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSaveRow}
                              className="h-7 w-7 p-0"
                              title="Save"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-7 w-7 p-0"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-700">{item.lineNumber}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.itemCode}</td>
                        <td className="px-3 py-2 text-gray-900">{item.itemName}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{item.description || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{item.quantity}</td>
                        <td className="px-3 py-2 text-gray-600">{item.unitOfMeasure}</td>
                        <td className="px-3 py-2 text-right text-gray-900">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.discountPercent}%</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.taxPercent}%</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          ${item.lineTotalWithTax.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRow(index)}
                              disabled={disabled || editingIndex !== null}
                              className="h-7 w-7 p-0"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRow(index)}
                              disabled={disabled || editingIndex !== null}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={9} className="px-3 py-3 text-right font-semibold text-gray-700">
                    Subtotal:
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">
                    ${totals.subtotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={9} className="px-3 py-2 text-right font-semibold text-gray-700">
                    Total Tax:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    ${totals.tax.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-blue-50">
                  <td colSpan={9} className="px-3 py-3 text-right font-bold text-gray-900 text-base">
                    Grand Total:
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-600 text-base">
                    ${totals.total.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {items.length > 0 && (
        <div className="text-xs text-gray-500">
          <p>• Click Edit to modify an item or Delete to remove it</p>
          <p>• Discount and Tax are automatically calculated based on percentages</p>
          <p>• Line Total = (Quantity × Unit Price) - Discount + Tax</p>
        </div>
      )}
    </div>
  );
}
