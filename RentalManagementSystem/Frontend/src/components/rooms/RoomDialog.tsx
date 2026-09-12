import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, Button, Input } from '../ui';
import { roomService } from '../../services';
import type { Room, CreateRoomRequest, UpdateRoomRequest, RoomType, RoomStatus } from '../../types';
import { parseDecimalInput } from '../../utils';
import { defineMessage } from '../../utils/i18n';
import { useTranslation } from '../../hooks/useTranslation';

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSuccess: () => void;
}

const roomTypeOptions = [
  { value: 1, message: defineMessage('rooms.typeSingle', 'Single') },
  { value: 2, message: defineMessage('rooms.typeDouble', 'Double') },
  { value: 3, message: defineMessage('rooms.typeTriple', 'Triple') },
  { value: 4, message: defineMessage('rooms.typeSuite', 'Suite') },
  { value: 5, message: defineMessage('rooms.typeStudio', 'Studio') },
  { value: 6, message: defineMessage('rooms.typeApartment', 'Apartment') },
];

const roomStatusOptions = [
  { value: 1, message: defineMessage('rooms.available', 'Available') },
  { value: 2, message: defineMessage('rooms.occupied', 'Occupied') },
  { value: 3, message: defineMessage('rooms.statusMaintenance', 'Maintenance') },
  { value: 4, message: defineMessage('rooms.statusReserved', 'Reserved') },
];

export function RoomDialog({ open, onOpenChange, room, onSuccess }: RoomDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 1 as RoomType,
    status: 1 as RoomStatus,
    monthlyRent: '',
    floor: '',
    area: '',
    description: '',
    hasAirConditioning: false,
    hasPrivateBathroom: false,
    isFurnished: false,
  });

  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber,
        type: room.type,
        status: room.status || 1, // Ensure status is never 0, default to Vacant (1)
        monthlyRent: room.monthlyRent.toString(),
        floor: room.floor.toString(),
        area: room.area?.toString() || '',
        description: room.description || '',
        hasAirConditioning: room.hasAirConditioning,
        hasPrivateBathroom: room.hasPrivateBathroom,
        isFurnished: room.isFurnished,
      });
    } else {
      setFormData({
        roomNumber: '',
        type: 1,
        status: 1 as RoomStatus,
        monthlyRent: '',
        floor: '',
        area: '',
        description: '',
        hasAirConditioning: false,
        hasPrivateBathroom: false,
        isFurnished: false,
      });
    }
    setError(null);
  }, [room, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure status is a valid RoomStatus enum value (1-4)
      const validStatus = formData.status && formData.status >= 1 && formData.status <= 4 
        ? formData.status 
        : 1; // Default to Vacant if invalid

      const requestData = {
        roomNumber: formData.roomNumber,
        type: formData.type,
        status: validStatus,
        monthlyRent: parseDecimalInput(formData.monthlyRent) ?? 0,
        floor: parseDecimalInput(formData.floor) ?? 0,
        area: formData.area ? parseDecimalInput(formData.area) ?? undefined : undefined,
        description: formData.description,
        hasAirConditioning: formData.hasAirConditioning,
        hasPrivateBathroom: formData.hasPrivateBathroom,
        isFurnished: formData.isFurnished,
      };

      let response;
      if (room) {
        response = await roomService.updateRoom(String(room.id), requestData as UpdateRoomRequest);
      } else {
        response = await roomService.createRoom(requestData as CreateRoomRequest);
      }

      if (response.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(response.message || 'Failed to save room');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{room ? t('rooms.editRoom', 'Edit Room') : t('rooms.addRoom', 'Add Room')}</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.roomNumber', 'Room Number')} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) => handleChange('roomNumber', e.target.value)}
                  placeholder={t('rooms.roomNumberPlaceholder', 'e.g. 101')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.roomType', 'Type')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', parseInt(e.target.value) as RoomType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roomTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.message.key, option.message.defaultValue)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.price', 'Monthly Rent')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.monthlyRent}
                  onChange={(e) => handleChange('monthlyRent', e.target.value)}
                  placeholder="vd: 3.500.000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.status', 'Status')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', Number(e.target.value) as RoomStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roomStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.message.key, option.message.defaultValue)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.floor', 'Floor')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formData.floor}
                  onChange={(e) => handleChange('floor', e.target.value)}
                  placeholder="vd: 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.area', 'Area (m²)')}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  placeholder="vd: 35,5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('items.description', 'Description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('rooms.descriptionPlaceholder', 'Notes about this room...')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('rooms.amenities', 'Amenities')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasAirConditioning}
                    onChange={(e) => handleChange('hasAirConditioning', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('rooms.airConditioning', 'Air conditioning')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasPrivateBathroom}
                    onChange={(e) => handleChange('hasPrivateBathroom', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('rooms.privateBathroom', 'Private bathroom')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isFurnished}
                    onChange={(e) => handleChange('isFurnished', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('rooms.furnished', 'Furnished')}</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : room
                  ? t('common.update', 'Update')
                  : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
