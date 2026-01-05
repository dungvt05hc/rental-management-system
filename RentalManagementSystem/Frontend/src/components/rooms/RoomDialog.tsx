import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, Button, Input } from '../ui';
import { roomService } from '../../services';
import type { Room, CreateRoomRequest, UpdateRoomRequest, RoomType, RoomStatus } from '../../types';

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  onSuccess: () => void;
}

const roomTypeOptions = [
  { value: 1, label: 'Single' },
  { value: 2, label: 'Double' },
  { value: 3, label: 'Triple' },
  { value: 4, label: 'Suite' },
  { value: 5, label: 'Studio' },
  { value: 6, label: 'Apartment' },
];

const roomStatusOptions = [
  { value: 1, label: 'Vacant' },
  { value: 2, label: 'Rented' },
  { value: 3, label: 'Maintenance' },
  { value: 4, label: 'Reserved' },
];

export function RoomDialog({ open, onOpenChange, room, onSuccess }: RoomDialogProps) {
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
        monthlyRent: parseFloat(formData.monthlyRent),
        floor: parseInt(formData.floor),
        area: formData.area ? parseFloat(formData.area) : undefined,
        description: formData.description,
        hasAirConditioning: formData.hasAirConditioning,
        hasPrivateBathroom: formData.hasPrivateBathroom,
        isFurnished: formData.isFurnished,
      };

      console.log('Form data before submit:', formData);
      console.log('Request data being sent:', requestData);

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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{room ? 'Edit Room' : 'Add New Room'}</DialogTitle>
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
                  Room Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) => handleChange('roomNumber', e.target.value)}
                  placeholder="e.g., 101"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', parseInt(e.target.value) as RoomType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roomTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthlyRent}
                  onChange={(e) => handleChange('monthlyRent', e.target.value)}
                  placeholder="e.g., 1200.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', Number(e.target.value) as RoomStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roomStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => handleChange('floor', e.target.value)}
                  placeholder="e.g., 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (sq.m)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  placeholder="e.g., 35.50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Room description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasAirConditioning}
                    onChange={(e) => handleChange('hasAirConditioning', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Air Conditioning</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasPrivateBathroom}
                    onChange={(e) => handleChange('hasPrivateBathroom', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Private Bathroom</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isFurnished}
                    onChange={(e) => handleChange('isFurnished', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Furnished</span>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
