import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button, Input, AlertDialog } from '../ui';
import type { InvoiceItem, Item } from '../../types';
import { itemService } from '../../services';

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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemIndex: number | null;
    itemName: string;
  }>({
    open: false,
    itemIndex: null,
    itemName: '',
  });

  // Load available items when component mounts
  useEffect(() => {
    loadAvailableItems();
  }, []);

  const loadAvailableItems = async () => {
    try {
      const response = await itemService.getActiveItems();
      if (response.success && response.data) {
        setAvailableItems(response.data);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

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

  const handleDeleteRow = (index: number, itemName: string) => {
    setConfirmDialog({
      open: true,
      itemIndex: index,
      itemName,
    });
  };

  const confirmDeleteItem = () => {
    if (confirmDialog.itemIndex === null) return;
    const newItems = items.filter((_, i) => i !== confirmDialog.itemIndex);
    // Renumber lines
    const renumberedItems = newItems.map((item, i) => ({
      ...item,
      lineNumber: i + 1,
    }));
    onChange(renumberedItems);
    setConfirmDialog({ open: false, itemIndex: null, itemName: '' });
  };

  const handleFieldChange = (field: keyof InvoiceItem, value: any) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        [field]: value,
      });
    }
  };

  const handleSelectItem = (item: Item) => {
    if (editingItem) {
      // Populate fields from selected item
      setEditingItem({
        ...editingItem,
        itemCode: item.itemCode,
        itemName: item.itemName,
        description: item.description || '',
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent || 0,
        category: item.category || '',
        notes: item.notes || '',
      });
      setShowItemSelector(false);
      setItemSearchTerm('');
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.itemCode.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
    item.itemName.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(itemSearchTerm.toLowerCase()))
  );

  const totals = items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + (item.quantity * item.unitPrice),
      discount: acc.discount + item.discountAmount,
      afterDiscount: acc.afterDiscount + item.lineTotal,
      tax: acc.tax + item.taxAmount,
      total: acc.total + item.lineTotalWithTax,
    }),
    { subtotal: 0, discount: 0, afterDiscount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Invoice Line Items</h3>
          <p className="text-xs text-gray-500 mt-1">All item details are displayed including calculations</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled || editingIndex !== null}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 w-10"></th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 w-12">#</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 min-w-[120px]">Item</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 min-w-[140px]">Item Name</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 min-w-[150px]">Description</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-20">Qty</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 w-20">UoM</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-28">Unit Price</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-24">Disc %</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-28">Disc Amt</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-24">Tax %</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-28">Tax Amt</th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 w-32">Line Total</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-gray-500 font-medium">No items added yet</p>
                      <p className="text-gray-400 text-xs">Click "Add Item" button to add line items to this invoice</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isExpanded = expandedRows.has(index);
                  const isEditing = editingIndex === index;
                  
                  return (
                    <>
                      <tr key={index} className={`hover:bg-gray-50 ${isExpanded ? 'bg-blue-50' : ''}`}>
                        {isEditing ? (
                          <>
                            <td className="px-3 py-2"></td>
                            <td className="px-3 py-2 text-gray-700 font-medium">{item.lineNumber}</td>
                            <td className="px-3 py-2">
                              <Input
                                value={editingItem?.itemCode || ''}
                                onChange={(e) => handleFieldChange('itemCode', e.target.value)}
                                className="h-9 text-xs"
                                placeholder="Item Code"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={editingItem?.itemName || ''}
                                onChange={(e) => handleFieldChange('itemName', e.target.value)}
                                className="h-9 text-xs"
                                placeholder="Item name"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={editingItem?.description || ''}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                className="h-9 text-xs"
                                placeholder="Description"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.001"
                                value={editingItem?.quantity || 0}
                                onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
                                className="h-9 text-xs text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                list="uom-options"
                                value={editingItem?.unitOfMeasure || 'pcs'}
                                onChange={(e) => handleFieldChange('unitOfMeasure', e.target.value)}
                                className="h-9 text-xs border border-gray-300 rounded px-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="UoM"
                              />
                              <datalist id="uom-options">
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
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={editingItem?.unitPrice || 0}
                                onChange={(e) => handleFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
                                className="h-9 text-xs text-right"
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
                                className="h-9 text-xs text-right"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 font-medium">
                              ${calculateItemTotals(editingItem!).discountAmount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={editingItem?.taxPercent || 0}
                                onChange={(e) => handleFieldChange('taxPercent', parseFloat(e.target.value) || 0)}
                                className="h-9 text-xs text-right"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 font-medium">
                              ${calculateItemTotals(editingItem!).taxAmount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600">
                              ${calculateItemTotals(editingItem!).lineTotalWithTax.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleSaveRow}
                                  className="h-8 w-8 p-0 bg-green-50 hover:bg-green-100 text-green-600"
                                  title="Save"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-8 w-8 p-0 bg-gray-50 hover:bg-gray-100"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => toggleRowExpansion(index)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title={isExpanded ? 'Collapse details' : 'Expand details'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-gray-700 font-semibold">{item.lineNumber}</td>
                            <td className="px-3 py-2 font-mono text-xs text-blue-600 font-medium">{item.itemCode}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{item.itemName}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{item.description || '-'}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{item.unitOfMeasure}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-orange-600 font-medium">{item.discountPercent}%</td>
                            <td className="px-3 py-2 text-right text-orange-600 font-medium">
                              ${item.discountAmount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-purple-600 font-medium">{item.taxPercent}%</td>
                            <td className="px-3 py-2 text-right text-purple-600 font-medium">
                              ${item.taxAmount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600 text-base">
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
                                  className="h-8 w-8 p-0 hover:bg-blue-50"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteRow(index, item.itemName)}
                                  disabled={disabled || editingIndex !== null}
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                      
                      {/* Expanded row showing Category and Notes */}
                      {isExpanded && !isEditing && (
                        <tr className="bg-blue-50 border-t border-blue-200">
                          <td colSpan={14} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                                <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                                  {item.category || <span className="text-gray-400 italic">No category specified</span>}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Notes</label>
                                <p className="text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-200 min-h-[40px]">
                                  {item.notes || <span className="text-gray-400 italic">No additional notes</span>}
                                </p>
                              </div>
                            </div>
                            
                            {/* Calculation breakdown */}
                            <div className="mt-4 pt-4 border-t border-blue-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Calculation Breakdown:</p>
                              <div className="grid grid-cols-4 gap-4 text-xs">
                                <div className="bg-white px-3 py-2 rounded border border-gray-200">
                                  <span className="text-gray-600">Subtotal:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    ${(item.quantity * item.unitPrice).toFixed(2)}
                                  </span>
                                </div>
                                <div className="bg-white px-3 py-2 rounded border border-orange-200">
                                  <span className="text-gray-600">- Discount:</span>
                                  <span className="ml-2 font-semibold text-orange-600">
                                    ${item.discountAmount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="bg-white px-3 py-2 rounded border border-purple-200">
                                  <span className="text-gray-600">+ Tax:</span>
                                  <span className="ml-2 font-semibold text-purple-600">
                                    ${item.taxAmount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="bg-blue-100 px-3 py-2 rounded border border-blue-300">
                                  <span className="text-gray-600">= Total:</span>
                                  <span className="ml-2 font-bold text-blue-600">
                                    ${item.lineTotalWithTax.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Editing Category and Notes */}
                      {isEditing && (
                        <>
                          {/* Item Selector Section */}
                          <tr className="bg-gradient-to-r from-green-50 to-blue-50 border-t-2 border-green-200">
                            <td colSpan={14} className="px-6 py-4">
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                  <label className="block text-sm font-bold text-gray-900">
                                    🔍 Select from Item Master
                                  </label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowItemSelector(!showItemSelector)}
                                    className="flex items-center space-x-2"
                                  >
                                    <Search className="h-4 w-4" />
                                    <span>{showItemSelector ? 'Hide Items' : 'Browse Items'}</span>
                                  </Button>
                                </div>
                                
                                {showItemSelector && (
                                  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
                                    <div className="mb-3">
                                      <Input
                                        value={itemSearchTerm}
                                        onChange={(e) => setItemSearchTerm(e.target.value)}
                                        placeholder="Search by item code, name, or category..."
                                        className="w-full"
                                      />
                                    </div>
                                    
                                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                                      {filteredItems.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                          <p className="font-medium">No items found</p>
                                          <p className="text-xs mt-1">Try a different search term</p>
                                        </div>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                              <th className="px-3 py-2 text-left font-semibold">Code</th>
                                              <th className="px-3 py-2 text-left font-semibold">Name</th>
                                              <th className="px-3 py-2 text-left font-semibold">Category</th>
                                              <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                                              <th className="px-3 py-2 text-center font-semibold">UoM</th>
                                              <th className="px-3 py-2 text-right font-semibold">Tax %</th>
                                              <th className="px-3 py-2 text-center font-semibold">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {filteredItems.map((availableItem) => (
                                              <tr
                                                key={availableItem.id}
                                                className="hover:bg-blue-50 transition-colors cursor-pointer"
                                                onClick={() => handleSelectItem(availableItem)}
                                              >
                                                <td className="px-3 py-2 font-mono text-blue-600 font-medium">
                                                  {availableItem.itemCode}
                                                </td>
                                                <td className="px-3 py-2 font-medium text-gray-900">
                                                  {availableItem.itemName}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                  {availableItem.category || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                  ${availableItem.unitPrice.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-700">
                                                  {availableItem.unitOfMeasure}
                                                </td>
                                                <td className="px-3 py-2 text-right text-purple-600 font-medium">
                                                  {availableItem.taxPercent}%
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSelectItem(availableItem)}
                                                    className="h-7 px-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
                                                  >
                                                    Select
                                                  </Button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-gray-500 mt-2">
                                      💡 Click on any item to auto-populate its details (UoM, Tax %, Category, etc.)
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Category and Notes Section */}
                          <tr className="bg-yellow-50 border-t border-yellow-200">
                            <td colSpan={14} className="px-6 py-4">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Category
                                  </label>
                                  <Input
                                    value={editingItem?.category || ''}
                                    onChange={(e) => handleFieldChange('category', e.target.value)}
                                    className="h-9 text-sm"
                                    placeholder="e.g., Rent, Utilities, Services, etc."
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Additional Notes
                                  </label>
                                  <textarea
                                    value={editingItem?.notes || ''}
                                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Any additional notes or special instructions for this line item..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={7} className="px-3 py-3 text-right font-semibold text-gray-700">
                    Subtotal (before discounts):
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900" colSpan={6}>
                    ${totals.subtotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-right font-semibold text-orange-700">
                    Total Discounts:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-orange-600" colSpan={6}>
                    -${totals.discount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-right font-semibold text-gray-700">
                    Subtotal (after discounts):
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900" colSpan={6}>
                    ${totals.afterDiscount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-right font-semibold text-purple-700">
                    Total Tax:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-purple-600" colSpan={6}>
                    +${totals.tax.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-blue-100 border-t-2 border-blue-300">
                  <td colSpan={7} className="px-3 py-4 text-right font-bold text-gray-900 text-lg">
                    Items Total:
                  </td>
                  <td className="px-3 py-4 text-right font-bold text-blue-600 text-xl" colSpan={6}>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-gray-700">
          <p className="font-semibold text-blue-900 mb-2">💡 Tips:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Click the arrow (▶/▼)</strong> on the left to expand/collapse additional details (Category & Notes)</li>
            <li>• <strong>Edit button</strong> allows you to modify all item fields including Category and Notes</li>
            <li>• <strong>Discount Amount</strong> and <strong>Tax Amount</strong> are automatically calculated</li>
            <li>• <strong>Line Total</strong> = (Qty × Unit Price) - Discount + Tax</li>
          </ul>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, itemIndex: null, itemName: '' })
        }
        title="Delete Item"
        description={`Are you sure you want to remove "${confirmDialog.itemName}" from this invoice? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteItem}
        variant="warning"
      />
    </div>
  );
}
