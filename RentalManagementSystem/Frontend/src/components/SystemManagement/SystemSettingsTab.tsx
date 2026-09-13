import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronDown, Download, Plus, RefreshCw, Save, Settings, Trash2, Upload } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import {
  systemManagementApi,
  type CreateSystemSettingDto,
  type SystemSetting,
  type SystemSettingsByCategory,
} from '../../services/systemManagementApi';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════════════
 * Cấu hình hệ thống.
 *
 * Màn hình này sửa những giá trị chạy ngầm cả ứng dụng, nên thứ quan trọng
 * nhất là NGƯỜI DÙNG BIẾT MÌNH ĐÃ SỬA GÌ trước khi bấm Lưu. Vì vậy:
 *
 *   - Thanh Lưu DÍNH ĐÁY và đếm rõ bao nhiêu mục đang sửa dở.
 *   - Mục đã sửa được đánh dấu ngay tại dòng, không chờ tới lúc lưu.
 *   - Mục không sửa được hiện chip "khoá" thay vì chỉ làm ô nhập mờ đi — ô mờ
 *     trông giống lỗi tải dữ liệu.
 *
 * ĐÃ BỎ ba biến state chết: `error` (có setError nhưng không render ở đâu),
 * `successMessage` và `setSuccessMessage` (không ai gọi). Cả ba đều bị eslint
 * báo và cả ba đều là tàn dư của một bản trước khi chuyển sang toast.
 *
 * ĐÃ SỬA chuỗi tiếng Anh viết cứng: "Save Changes (n)", "Creating…",
 * "Create Setting", "Failed to load settings".
 * ═══════════════════════════════════════════════════════════════════════════ */

const DATA_TYPES = [
  { value: 'string', key: 'system.typeString', fallback: 'Text' },
  { value: 'number', key: 'system.typeNumber', fallback: 'Number' },
  { value: 'boolean', key: 'system.typeBoolean', fallback: 'True/false' },
  { value: 'json', key: 'json', fallback: 'JSON' },
] as const;

const EMPTY_SETTING: CreateSystemSettingDto = {
  key: '',
  value: '',
  category: '',
  dataType: 'string',
  description: '',
};

const SystemSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [settingsByCategory, setSettingsByCategory] = useState<SystemSettingsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newSetting, setNewSetting] = useState<CreateSystemSettingDto>(EMPTY_SETTING);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'delete' | 'seed' | null;
    settingKey: string;
  }>({ open: false, action: null, settingKey: '' });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await systemManagementApi.getSettingsByCategory();
      setSettingsByCategory(data);
      setEditedSettings({});
      setExpandedCategories(new Set(data.map((category) => category.category)));
    } catch (err) {
      // systemManagementApi gọi thẳng axios (không qua apiService) nên lỗi ở
      // đây là AxiosError, body lỗi nằm trong response.data.
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setLoadError(message ?? t('system.loadError', 'Could not load the settings'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const editedCount = Object.keys(editedSettings).length;

  const handleSaveSettings = async () => {
    if (editedCount === 0) {
      showInfo(t('common.info', 'Info'), t('system.noChanges', 'No changes to save'));
      return;
    }

    try {
      setLoading(true);
      const settings = Object.entries(editedSettings).map(([key, value]) => ({ key, value }));
      await systemManagementApi.bulkUpdateSettings({ settings });
      showSuccess(
        t('common.success', 'Success'),
        t('system.settingsUpdated', 'Updated {count} settings.', { count: settings.length })
      );
      await loadSettings();
    } catch {
      showError(t('common.error', 'Error'), t('system.saveError', 'Failed to save settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    try {
      setLoading(true);
      await systemManagementApi.createSetting(newSetting);
      showSuccess(
        t('common.success', 'Success'),
        t('system.settingCreated', 'Setting created successfully')
      );
      setCreateDialogOpen(false);
      setNewSetting(EMPTY_SETTING);
      await loadSettings();
    } catch {
      showError(t('common.error', 'Error'), t('system.createError', 'Failed to create setting'));
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (confirmDialog.action === 'delete' && confirmDialog.settingKey) {
      try {
        await systemManagementApi.deleteSetting(confirmDialog.settingKey);
        showSuccess(
          t('common.success', 'Success'),
          t('system.settingDeleted', 'Setting deleted successfully')
        );
        await loadSettings();
      } catch {
        showError(t('common.error', 'Error'), t('system.deleteError', 'Failed to delete setting'));
      }
    } else if (confirmDialog.action === 'seed') {
      try {
        await systemManagementApi.seedDefaultSettings();
        showSuccess(
          t('common.success', 'Success'),
          t('system.settingsSeeded', 'Default settings seeded successfully')
        );
        await loadSettings();
      } catch {
        showError(t('common.error', 'Error'), t('system.seedError', 'Failed to seed settings'));
      }
    }
    setConfirmDialog({ open: false, action: null, settingKey: '' });
  };

  const handleExportSettings = async () => {
    try {
      const blob = await systemManagementApi.exportSettings();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      showSuccess(
        t('common.success', 'Success'),
        t('system.settingsExported', 'Settings exported successfully')
      );
    } catch {
      showError(t('common.error', 'Error'), t('system.exportError', 'Failed to export settings'));
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = editedSettings[setting.key] ?? setting.value;
    const disabled = !setting.isEditable || loading;
    const onChange = (value: string) =>
      setEditedSettings((previous) => ({ ...previous, [setting.key]: value }));

    if (setting.dataType === 'boolean') {
      return (
        <Select value={currentValue} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-label={setting.key}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t('system.valueTrue', 'True')}</SelectItem>
            <SelectItem value="false">{t('system.valueFalse', 'False')}</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (setting.dataType === 'json') {
      return (
        <textarea
          value={currentValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={4}
          aria-label={setting.key}
          className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 font-mono text-sm text-ink transition-colors duration-100 hover:border-ink-muted disabled:cursor-not-allowed disabled:bg-secondary"
        />
      );
    }

    return (
      <Input
        type={setting.dataType === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={setting.key}
      />
    );
  };

  if (loading && settingsByCategory.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {loadError && (
        <Alert variant="error" title={t('system.loadError', 'Could not load the settings')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={loadSettings}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Hành động phụ. Nút Lưu KHÔNG nằm ở đây — nó ở thanh dính đáy. */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={loadSettings}
          disabled={loading}
          leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          {t('common.refresh', 'Refresh')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setCreateDialogOpen(true)}
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          {t('system.createSetting', 'Create setting')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirmDialog({ open: true, action: 'seed', settingKey: '' })}
          disabled={loading}
          leadingIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
        >
          {t('system.seedSettingsTitle', 'Seed Default Settings')}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportSettings}
          leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
        >
          {t('system.export', 'Export')}
        </Button>
      </div>

      {/* Chưa có cấu hình nào: mời gieo bộ mặc định, đó là việc đúng phải làm
          tiếp. Bản cũ để trắng trang dưới hàng nút. */}
      {!loading && settingsByCategory.length === 0 && !loadError && (
        <EmptyState
          icon={<Settings className="h-8 w-8" />}
          title={t('system.emptyTitle', 'No settings yet')}
          description={t(
            'system.emptyBody',
            'Seed the defaults to get the usual settings, then adjust what you need.'
          )}
          action={
            <Button
              onClick={() => setConfirmDialog({ open: true, action: 'seed', settingKey: '' })}
              leadingIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
            >
              {t('system.seedSettingsTitle', 'Seed Default Settings')}
            </Button>
          }
        />
      )}

      {settingsByCategory.map((category) => {
        const isExpanded = expandedCategories.has(category.category);
        return (
          <Card key={category.category} className="overflow-hidden">
            <h3>
              <button
                type="button"
                onClick={() => toggleCategory(category.category)}
                aria-expanded={isExpanded}
                className="focus-ring flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-secondary sm:px-5"
              >
                <span className="font-semibold text-ink">
                  {category.category}{' '}
                  <span className="numeric font-normal text-ink-muted">
                    ({category.settings.length})
                  </span>
                </span>
                {/* Mũi tên xoay: trạng thái đóng/mở đọc được bằng hình, không
                    phải bằng dấu + / − gõ tay như bản cũ. */}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-100 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>

            {isExpanded && (
              <ul className="flex flex-col divide-y divide-line border-t border-line">
                {category.settings.map((setting) => {
                  const isEdited = editedSettings[setting.key] !== undefined;
                  return (
                    <li
                      key={setting.key}
                      className={`grid gap-3 p-4 sm:px-5 md:grid-cols-12 ${
                        isEdited ? 'bg-primary-tint' : ''
                      }`}
                    >
                      <div className="md:col-span-4">
                        <p className="font-mono text-sm font-medium text-ink">{setting.key}</p>
                        {setting.description && (
                          <p className="mt-0.5 text-sm text-ink-muted">{setting.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" size="sm">
                            {setting.dataType}
                          </Badge>
                          {/* Nói thẳng vì sao ô bị khoá. Chỉ làm ô mờ đi thì
                              trông giống trang đang tải lỗi. */}
                          {!setting.isEditable && (
                            <Badge variant="outline" size="sm">
                              {t('system.readOnly', 'Read-only')}
                            </Badge>
                          )}
                          {isEdited && (
                            <Badge status="unpaid" size="sm">
                              {t('system.edited', 'Edited')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-7">{renderSettingInput(setting)}</div>

                      <div className="flex items-start justify-end md:col-span-1">
                        {setting.isEditable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive-tint"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: 'delete',
                                settingKey: setting.key,
                              })
                            }
                            disabled={loading}
                            aria-label={t('system.deleteNamed', 'Delete {key}', { key: setting.key })}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}

      {/* Thanh Lưu chỉ hiện khi thật sự có thay đổi — một thanh dính đáy luôn
          hiện mà nút luôn mờ chỉ ăn mất chiều cao màn hình. */}
      {editedCount > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 py-3 shadow-sticky sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink" role="status">
              {t('system.pendingChanges', '{count} settings changed but not saved', {
                count: editedCount,
              })}
            </p>
            <div className="flex gap-2 max-sm:w-full">
              <Button
                variant="outline"
                onClick={() => setEditedSettings({})}
                disabled={loading}
                className="max-sm:flex-1"
              >
                {t('system.discardChanges', 'Discard changes')}
              </Button>
              <Button
                onClick={handleSaveSettings}
                isLoading={loading}
                loadingText={t('common.saving', 'Saving...')}
                leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
                className="max-sm:flex-1"
              >
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tạo cấu hình mới ───────────────────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('system.createSetting', 'Create setting')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <Input
              label={t('system.settingKey', 'Key')}
              required
              value={newSetting.key}
              onChange={(event) => setNewSetting({ ...newSetting, key: event.target.value })}
              placeholder={t('system.keyPlaceholder', 'e.g. app.theme')}
              hint={t('system.keyHint', 'A unique name for this setting')}
            />

            <Input
              label={t('system.settingValue', 'Value')}
              required
              value={newSetting.value}
              onChange={(event) => setNewSetting({ ...newSetting, value: event.target.value })}
              placeholder={t('system.valuePlaceholder', 'e.g. dark')}
              hint={t('system.valueHint', 'What this setting is set to')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('items.category', 'Category')}
                required
                value={newSetting.category}
                onChange={(event) => setNewSetting({ ...newSetting, category: event.target.value })}
                placeholder={t('system.categoryPlaceholder', 'e.g. General')}
                hint={t('system.categoryHint', 'Groups related settings together')}
              />

              <div>
                <label
                  htmlFor="new-setting-type"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  {t('system.dataType', 'Data type')}
                </label>
                <Select
                  value={newSetting.dataType}
                  onValueChange={(value) => setNewSetting({ ...newSetting, dataType: value })}
                >
                  <SelectTrigger id="new-setting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.key, type.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-sm text-ink-muted">
                  {t('system.dataTypeHint', 'The kind of value stored')}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-setting-description"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {t('items.description', 'Description')}
              </label>
              <textarea
                id="new-setting-description"
                value={newSetting.description}
                onChange={(event) =>
                  setNewSetting({ ...newSetting, description: event.target.value })
                }
                rows={3}
                placeholder={t('system.descriptionPlaceholder', 'What this setting does (optional)')}
                className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
              />
              <p className="mt-1.5 text-sm text-ink-muted">
                {t(
                  'system.descriptionHint',
                  'Helps the next person understand what this setting is for'
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleCreateSetting}
              isLoading={loading}
              loadingText={t('common.saving', 'Saving...')}
              disabled={!newSetting.key || !newSetting.value || !newSetting.category}
            >
              {t('system.createSetting', 'Create setting')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, action: null, settingKey: '' })}
        title={
          confirmDialog.action === 'delete'
            ? t('system.deleteSettingTitle', 'Delete Setting')
            : t('system.seedSettingsTitle', 'Seed Default Settings')
        }
        description={
          confirmDialog.action === 'delete'
            ? t('system.deleteSettingMessage', 'Delete the setting "{key}"?', {
                key: confirmDialog.settingKey,
              })
            : t(
                'system.seedSettingsMessage',
                'This will create default system settings. Existing settings will not be overwritten. Continue?'
              )
        }
        confirmText={
          confirmDialog.action === 'delete'
            ? t('common.delete', 'Delete')
            : t('common.continue', 'Continue')
        }
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmAction}
        variant={confirmDialog.action === 'delete' ? 'destructive' : 'info'}
      />
    </div>
  );
};

export default SystemSettingsTab;
