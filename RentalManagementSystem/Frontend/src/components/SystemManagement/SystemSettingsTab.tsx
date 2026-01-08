import { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Download, Upload } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, AlertDialog } from '../ui';
import {
  systemManagementApi,
  type SystemSettingsByCategory,
  type SystemSetting,
  type CreateSystemSettingDto,
} from '../../services/systemManagementApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

const SystemSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();
  const [settingsByCategory, setSettingsByCategory] = useState<SystemSettingsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newSetting, setNewSetting] = useState<CreateSystemSettingDto>({
    key: '',
    value: '',
    category: '',
    dataType: 'string',
    description: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'delete' | 'seed' | null;
    settingKey: string;
  }>({
    open: false,
    action: null,
    settingKey: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemManagementApi.getSettingsByCategory();
      setSettingsByCategory(data);
      setEditedSettings({});
      setExpandedCategories(new Set(data.map(c => c.category)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const settingsToUpdate = Object.entries(editedSettings).map(([key, value]) => ({
        key,
        value,
      }));

      if (settingsToUpdate.length === 0) {
        showInfo(t('common.info', 'Info'), t('system.noChanges', 'No changes to save'));
        return;
      }

      await systemManagementApi.bulkUpdateSettings({ settings: settingsToUpdate });
      showSuccess(
        t('common.success', 'Success'),
        t('system.settingsUpdated', `Successfully updated ${settingsToUpdate.length} settings`)
      );
      await loadSettings();
    } catch (err: any) {
      showError(t('common.error', 'Error'), t('system.saveError', 'Failed to save settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    try {
      setLoading(true);
      await systemManagementApi.createSetting(newSetting);
      showSuccess(t('common.success', 'Success'), t('system.settingCreated', 'Setting created successfully'));
      setCreateDialogOpen(false);
      setNewSetting({
        key: '',
        value: '',
        category: '',
        dataType: 'string',
        description: '',
      });
      await loadSettings();
    } catch (err: any) {
      showError(t('common.error', 'Error'), t('system.createError', 'Failed to create setting'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSetting = (key: string) => {
    setConfirmDialog({
      open: true,
      action: 'delete',
      settingKey: key,
    });
  };

  const handleSeedSettings = () => {
    setConfirmDialog({
      open: true,
      action: 'seed',
      settingKey: '',
    });
  };

  const confirmAction = async () => {
    if (confirmDialog.action === 'delete' && confirmDialog.settingKey) {
      try {
        await systemManagementApi.deleteSetting(confirmDialog.settingKey);
        showSuccess(t('common.success', 'Success'), t('system.settingDeleted', 'Setting deleted successfully'));
        await loadSettings();
      } catch (err: any) {
        showError(t('common.error', 'Error'), t('system.deleteError', 'Failed to delete setting'));
      }
    } else if (confirmDialog.action === 'seed') {
      try {
        await systemManagementApi.seedDefaultSettings();
        showSuccess(t('common.success', 'Success'), t('system.settingsSeeded', 'Default settings seeded successfully'));
        await loadSettings();
      } catch (err: any) {
        showError(t('common.error', 'Error'), t('system.seedError', 'Failed to seed settings'));
      }
    }
    setConfirmDialog({ open: false, action: null, settingKey: '' });
  };

  const handleExportSettings = async () => {
    try {
      const blob = await systemManagementApi.exportSettings();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(t('common.success', 'Success'), t('system.settingsExported', 'Settings exported successfully'));
    } catch (err: any) {
      showError(t('common.error', 'Error'), t('system.exportError', 'Failed to export settings'));
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = editedSettings[setting.key] ?? setting.value;

    if (setting.dataType === 'boolean') {
      return (
        <select
          value={currentValue}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          disabled={!setting.isEditable || loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (setting.dataType === 'json') {
      return (
        <textarea
          value={currentValue}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          disabled={!setting.isEditable || loading}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
        />
      );
    }

    return (
      <Input
        type={setting.dataType === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
        disabled={!setting.isEditable || loading}
        className="w-full"
      />
    );
  };

  if (loading && settingsByCategory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveSettings}
              disabled={loading || Object.keys(editedSettings).length === 0}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes ({Object.keys(editedSettings).length})</span>
            </Button>
            <Button variant="outline" onClick={loadSettings} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Setting
            </Button>
            <Button variant="outline" onClick={handleSeedSettings} disabled={loading}>
              <Upload className="h-4 w-4 mr-2" />
              Seed Defaults
            </Button>
            <Button variant="outline" onClick={handleExportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings by Category */}
      <div className="space-y-4">
        {settingsByCategory.map((category) => (
          <Card key={category.category}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleCategory(category.category)}
            >
              <div className="flex justify-between items-center">
                <CardTitle>
                  {category.category} ({category.settings.length})
                </CardTitle>
                <span className="text-gray-500">
                  {expandedCategories.has(category.category) ? '−' : '+'}
                </span>
              </div>
            </CardHeader>
            {expandedCategories.has(category.category) && (
              <CardContent className="p-4">
                <div className="space-y-4">
                  {category.settings.map((setting) => (
                    <div key={setting.key} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                          <div className="font-semibold text-gray-900">{setting.key}</div>
                          {setting.description && (
                            <div className="text-sm text-gray-600 mt-1">{setting.description}</div>
                          )}
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {setting.dataType}
                            </span>
                          </div>
                        </div>
                        <div className="md:col-span-7">
                          {renderSettingInput(setting)}
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end space-x-2">
                          {setting.isEditable && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSetting(setting.key)}
                              disabled={loading}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Create Setting Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create New Setting</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newSetting.key}
                    onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                    placeholder="e.g., app.theme"
                    className="text-base h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">A unique identifier for this setting</p>
                </div>

                {/* Value Field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Value <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    placeholder="e.g., dark"
                    className="text-base h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">The value for this setting</p>
                </div>

                {/* Category Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newSetting.category}
                    onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                    placeholder="e.g., General"
                    className="text-base h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">Group similar settings together</p>
                </div>

                {/* Data Type Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data Type
                  </label>
                  <select
                    value={newSetting.dataType}
                    onChange={(e) => setNewSetting({ ...newSetting, dataType: e.target.value })}
                    className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">The type of data stored</p>
                </div>
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Optional description (explain what this setting does)"
                />
                <p className="text-xs text-gray-500 mt-1">Help others understand the purpose of this setting</p>
              </div>
            </div>
          </div>
          
          {/* Footer with Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
                className="px-6 py-2.5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSetting}
                disabled={!newSetting.key || !newSetting.value || !newSetting.category || loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Creating...' : 'Create Setting'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, action: null, settingKey: '' })
        }
        title={
          confirmDialog.action === 'delete'
            ? t('system.deleteSettingTitle', 'Delete Setting')
            : t('system.seedSettingsTitle', 'Seed Default Settings')
        }
        description={
          confirmDialog.action === 'delete'
            ? t(
                'system.deleteSettingMessage',
                `Are you sure you want to delete setting "${confirmDialog.settingKey}"?`
              )
            : t(
                'system.seedSettingsMessage',
                'This will create default system settings. Existing settings will not be overwritten. Continue?'
              )
        }
        confirmText={confirmDialog.action === 'delete' ? t('common.delete', 'Delete') : t('common.continue', 'Continue')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmAction}
        variant={confirmDialog.action === 'delete' ? 'destructive' : 'info'}
      />
    </div>
  );
};

export default SystemSettingsTab;
