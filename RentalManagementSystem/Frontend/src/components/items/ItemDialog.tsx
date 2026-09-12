import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button, Input, NumericInput } from '../ui';
import { itemService } from '../../services';
import type { Item } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess: () => void;
}

export function ItemDialog({ open, onOpenChange, item, onSuccess }: ItemDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    itemCode: item?.itemCode || '',
    itemName: item?.itemName || '',
    description: item?.description || '',
    category: item?.category || '',
    unitPrice: item?.unitPrice || 0,
    unitOfMeasure: item?.unitOfMeasure || 'pcs',
    taxPercent: item?.taxPercent || 0,
    isActive: item?.isActive ?? true,
  });

  React.useEffect(() => {
    if (item) {
      setFormData({
        itemCode: item.itemCode || '',
        itemName: item.itemName || '',
        description: item.description || '',
        category: item.category || '',
        unitPrice: item.unitPrice || 0,
        unitOfMeasure: item.unitOfMeasure || 'pcs',
        taxPercent: item.taxPercent || 0,
        isActive: item.isActive ?? true,
      });
    } else {
      setFormData({
        itemCode: '',
        itemName: '',
        description: '',
        category: '',
        unitPrice: 0,
        unitOfMeasure: 'pcs',
        taxPercent: 0,
        isActive: true,
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      if (item) {
        response = await itemService.updateItem(item.id, formData);
      } else {
        response = await itemService.createItem(formData);
      }

      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          item
            ? t('items.updateSuccess', 'Item updated successfully')
            : t('items.createSuccess', 'Item created successfully')
        );
        onSuccess();
        onOpenChange(false);
      } else {
        showError(t('common.error', 'Error'), response.message || t('items.saveError', 'Failed to save item'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? t('items.editItem', 'Edit Item') : t('items.createItem', 'Create New Item')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.itemCode', 'Item Code')} *
              </label>
              <Input
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                placeholder={t('items.itemCodePlaceholder', 'e.g. ITEM001')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.itemName', 'Item Name')} *
              </label>
              <Input
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder={t('items.itemNamePlaceholder', 'e.g. Monthly rent')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('items.description', 'Description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={t('items.descriptionPlaceholder', 'What this item is...')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.category', 'Category')}
              </label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('items.categoryShortPlaceholder', 'e.g. Rent, Utilities')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.unitOfMeasure', 'Unit of Measure')} *
              </label>
              <select
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pcs">{t('items.uomPieces', 'Pieces')}</option>
                <option value="month">{t('items.uomMonth', 'Month')}</option>
                <option value="day">{t('items.uomDay', 'Day')}</option>
                <option value="hour">{t('items.uomHour', 'Hour')}</option>
                <option value="unit">{t('items.uomUnit', 'Unit')}</option>
                <option value="service">{t('items.uomService', 'Service')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.unitPrice', 'Unit Price')} *
              </label>
              <NumericInput
                value={formData.unitPrice}
                onValueChange={(value) => setFormData({ ...formData, unitPrice: value ?? 0 })}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('items.taxPercent', 'Tax %')}
              </label>
              <NumericInput
                value={formData.taxPercent}
                onValueChange={(value) => setFormData({ ...formData, taxPercent: value ?? 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
              {t('items.isActive', 'Active')}
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common.saving', 'Saving...')
                : item
                ? t('common.update', 'Update')
                : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
