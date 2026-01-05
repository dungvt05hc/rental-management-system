import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '../ui';
import { RoomDialog } from './RoomDialog';
import { roomService } from '../../services';
import { formatCurrency } from '../../utils';
import type { Room, RoomSearchRequest, RoomStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function RoomsPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadRooms();
  }, [searchQuery, statusFilter, pagination.page]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: RoomSearchRequest = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        searchTerm: searchQuery || undefined,
        status: statusFilter || undefined,
      };

      const response = await roomService.getRooms(searchParams);

      if (response.success && response.data) {
        const paginatedData = response.data as any;
        // API returns items, page, pageSize, totalItems, totalPages
        setRooms(paginatedData.items || []);
        setPagination({
          page: paginatedData.page || 1,
          pageSize: paginatedData.pageSize || 10,
          totalCount: paginatedData.totalItems || 0,
          totalPages: paginatedData.totalPages || 1,
        });
      } else {
        throw new Error(response.message || 'Failed to load rooms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = () => {
    setSelectedRoom(null);
    setDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setDialogOpen(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(t('common.confirm', 'Are you sure you want to delete this room? This action cannot be undone.'))) return;

    try {
      const response = await roomService.deleteRoom(roomId);
      if (response.success) {
        // Show success message
        alert(t('common.success', 'Room deleted successfully'));
        await loadRooms();
      } else {
        alert(t('common.error', 'Failed to delete room: ') + response.message);
      }
    } catch (err) {
      alert(t('common.error', 'Error deleting room: ') + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDialogSuccess = () => {
    loadRooms();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'vacant':
        return 'bg-green-100 text-green-800';
      case 'rented':
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('rooms.title', 'Rooms Management')}</h1>
        <Button onClick={handleCreateRoom} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>{t('common.add', 'Add Room')}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('common.search', 'Search rooms...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RoomStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.filter', 'All Status')}</option>
                <option value="Available">{t('rooms.available', 'Available')}</option>
                <option value="Occupied">{t('rooms.occupied', 'Occupied')}</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.totalRooms', 'Total Rooms')}</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('rooms.available', 'Available')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {rooms?.filter(r => (r as any).statusName?.toLowerCase() === 'vacant').length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('rooms.occupied', 'Occupied')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rooms?.filter(r => (r as any).statusName?.toLowerCase() === 'rented' || (r as any).statusName?.toLowerCase() === 'occupied').length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.revenue', 'Avg. Rent')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {rooms && rooms.length > 0 ? formatCurrency(rooms.reduce((sum, r) => sum + r.monthlyRent, 0) / rooms.length) : '0'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rooms.title', 'Rooms')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadRooms} className="mt-4">
                {t('common.refresh', 'Try Again')}
              </Button>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('common.loading', 'No rooms found')}</p>
              <Button onClick={handleCreateRoom} className="mt-4">
                {t('common.add', 'Add Your First Room')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.roomNumber', 'Room Number')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.roomType', 'Type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.price', 'Monthly Rent')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Floor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.edit', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rooms?.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{room.roomNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">{(room as any).typeName || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadgeColor((room as any).statusName || room.status)}>
                            {(room as any).statusName || room.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(room.monthlyRent)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">Floor {room.floor}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRoom(room)}
                              className="h-8 w-8 p-0"
                              title={t('common.edit', 'Edit Room')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRoom(String(room.id))}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title={t('common.delete', 'Delete Room')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      const startPage = Math.max(1, pagination.page - 2);
                      const pageNum = startPage + i;
                      if (pageNum > pagination.totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Dialog */}
      <RoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        room={selectedRoom}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
