import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { itemService } from '../../services';
import type { Item, InvoiceItem } from '../../types';

interface ItemSelectorProps {
  onItemSelect: (item: InvoiceItem) => void;
}

export const ItemSelector: React.FC<ItemSelectorProps> = ({ onItemSelect }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  useEffect(() => {
    if (showDialog) {
      loadActiveItems();
    }
  }, [showDialog]);

  const loadActiveItems = async () => {
    try {
      setLoading(true);
      const response = await itemService.getActiveItems();
      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setQuantity(1);
    setDiscountPercent(0);
  };

  const handleAddToInvoice = () => {
    if (!selectedItem) return;

    const discountAmount = (quantity * selectedItem.unitPrice * discountPercent) / 100;
    const lineTotal = quantity * selectedItem.unitPrice - discountAmount;
    const taxAmount = (lineTotal * selectedItem.taxPercent) / 100;
    const lineTotalWithTax = lineTotal + taxAmount;

    const invoiceItem: InvoiceItem = {
      itemCode: selectedItem.itemCode,
      itemName: selectedItem.itemName,
      description: selectedItem.description || '',
      quantity: quantity,
      unitOfMeasure: selectedItem.unitOfMeasure,
      unitPrice: selectedItem.unitPrice,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      taxPercent: selectedItem.taxPercent,
      taxAmount: taxAmount,
      lineTotal: lineTotal,
      lineTotalWithTax: lineTotalWithTax,
      lineNumber: 0, // Will be set by parent
      category: selectedItem.category || '',
      notes: ''
    };

    onItemSelect(invoiceItem);
    setShowDialog(false);
    setSelectedItem(null);
    setQuantity(1);
    setDiscountPercent(0);
  };

  const filteredItems = items.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
      >
        <Plus size={18} />
        Add Item from Catalog
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Select Item</h2>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Items List */}
                <div className="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto">
                  <h3 className="font-semibold mb-3">Available Items</h3>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No items found</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedItem?.id === item.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{item.itemName}</div>
                          <div className="text-xs text-gray-500">{item.itemCode}</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            ${item.unitPrice.toFixed(2)} / {item.unitOfMeasure}
                          </div>
                          {item.category && (
                            <div className="text-xs text-gray-500 mt-1">
                              Category: {item.category}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Item Details</h3>
                  {selectedItem ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-bold">{selectedItem.itemName}</div>
                        <div className="text-sm text-gray-500">{selectedItem.itemCode}</div>
                        {selectedItem.description && (
                          <div className="text-sm text-gray-600 mt-2">{selectedItem.description}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Unit Price:</span>
                          <div className="font-semibold">${selectedItem.unitPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">UOM:</span>
                          <div className="font-semibold">{selectedItem.unitOfMeasure}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Tax:</span>
                          <div className="font-semibold">{selectedItem.taxPercent}%</div>
                        </div>
                        {selectedItem.category && (
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <div className="font-semibold">{selectedItem.category}</div>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={quantity}
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-semibold">
                              ${(quantity * selectedItem.unitPrice).toFixed(2)}
                            </span>
                          </div>
                          {discountPercent > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Discount ({discountPercent}%):</span>
                              <span>
                                -$
                                {((quantity * selectedItem.unitPrice * discountPercent) / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Tax ({selectedItem.taxPercent}%):</span>
                            <span>
                              $
                              {(
                                ((quantity * selectedItem.unitPrice -
                                  (quantity * selectedItem.unitPrice * discountPercent) / 100) *
                                  selectedItem.taxPercent) /
                                100
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-base pt-2 border-t">
                            <span>Total:</span>
                            <span>
                              $
                              {(
                                quantity * selectedItem.unitPrice -
                                (quantity * selectedItem.unitPrice * discountPercent) / 100 +
                                ((quantity * selectedItem.unitPrice -
                                  (quantity * selectedItem.unitPrice * discountPercent) / 100) *
                                  selectedItem.taxPercent) /
                                  100
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Select an item from the list to see details
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setSelectedItem(null);
                    setQuantity(1);
                    setDiscountPercent(0);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToInvoice}
                  disabled={!selectedItem || quantity <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
