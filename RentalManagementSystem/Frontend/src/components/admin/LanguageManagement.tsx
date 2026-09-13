import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  Checkbox,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Skeleton,
} from '../ui';
import type { DataTableColumn } from '../ui';
import { localizationService } from '../../services/localizationService';
import type { CreateLanguageDto, UpdateLanguageDto } from '../../services/localizationService';
import type { Language } from '../../types/localization';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════════════
 * Quản lý ngôn ngữ.
 *
 * LỖI NGHIÊM TRỌNG NHẤT ĐÃ SỬA: hộp thoại thêm/sửa được dựng tay bằng một
 * `div fixed inset-0` chứ không dùng Dialog của hệ thống. Hậu quả:
 *
 *   - Không bẫy tiêu điểm: nhấn Tab là con trỏ chạy ra sau lớp phủ, gõ vào
 *     những ô đang bị che.
 *   - Không đóng bằng Escape.
 *   - Không khoá cuộn nền.
 *   - Không có role="dialog"/aria-modal, nên trình đọc màn hình vẫn đọc cả
 *     trang phía sau như thể không có hộp thoại nào.
 *
 * Nay dùng Dialog chung — bốn thứ trên có sẵn.
 *
 * Cột "Mặc định" dùng NÚT SAO có nhãn đọc được, không phải một icon trần: bản
 * cũ chỉ có `title`, mà title không đọc được bằng bàn phím và trình đọc màn
 * hình bỏ qua trên phần tử không có tên.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface LanguageFormState {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY_FORM: LanguageFormState = {
  code: '',
  name: '',
  nativeName: '',
  isDefault: false,
  isActive: true,
};

export const LanguageManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [formData, setFormData] = useState<LanguageFormState>(EMPTY_FORM);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    languageCode: string;
    languageName: string;
  }>({ open: false, languageCode: '', languageName: '' });

  const loadLanguages = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setLanguages(await localizationService.getAllLanguages());
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : t('languages.loadError', 'Could not load the languages')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  const openCreate = () => {
    setEditingLanguage(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      isDefault: language.isDefault,
      isActive: language.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingLanguage) {
        const payload: UpdateLanguageDto = {
          name: formData.name,
          nativeName: formData.nativeName,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
        };
        await localizationService.updateLanguage(editingLanguage.code, payload);
        showSuccess(
          t('common.success', 'Success'),
          t('languages.updateSuccess', 'Language updated successfully')
        );
      } else {
        const payload: CreateLanguageDto = {
          code: formData.code,
          name: formData.name,
          nativeName: formData.nativeName,
          isDefault: formData.isDefault,
        };
        await localizationService.createLanguage(payload);
        showSuccess(
          t('common.success', 'Success'),
          t('languages.createSuccess', 'Language created successfully')
        );
      }

      setIsModalOpen(false);
      setEditingLanguage(null);
      setFormData(EMPTY_FORM);
      await loadLanguages();
    } catch (err) {
      // Backend nay trả câu từ chối viết cho người dùng (DomainException), nên
      // hiện nguyên văn nếu có — "Mã ngôn ngữ 'vi' đã tồn tại" hữu ích hơn hẳn
      // một câu chung chung.
      showError(
        t('common.error', 'Error'),
        err instanceof Error
          ? err.message
          : editingLanguage
            ? t('languages.updateError', 'Failed to update language')
            : t('languages.createError', 'Failed to create language')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteLanguage = async () => {
    if (!confirmDialog.languageCode) return;

    try {
      await localizationService.deleteLanguage(confirmDialog.languageCode);
      showSuccess(
        t('common.success', 'Success'),
        t('languages.deleteSuccess', 'Language deleted successfully')
      );
      await loadLanguages();
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('languages.deleteError', 'Failed to delete language')
      );
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      await localizationService.setDefaultLanguage(code);
      await loadLanguages();
      showSuccess(
        t('common.success', 'Success'),
        t('languages.setDefaultSuccess', 'Default language set successfully')
      );
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error
          ? err.message
          : t('languages.setDefaultError', 'Failed to set default language')
      );
    }
  };

  const columns: DataTableColumn<Language>[] = useMemo(
    () => [
      {
        key: 'language',
        header: t('languages.name', 'Name'),
        cell: (language) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">{language.nativeName}</span>
            <span className="block truncate text-xs text-ink-muted">
              {language.name} · <span className="numeric">{language.code}</span>
            </span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        cell: (language) => (
          <Badge status={language.isActive ? 'active' : 'inactive'} size="sm">
            {language.isActive
              ? t('common.statusActive', 'Active')
              : t('common.statusInactive', 'Inactive')}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-32',
      },
      {
        key: 'default',
        header: t('languages.default', 'Default'),
        width: 'w-36',
        cell: (language) =>
          language.isDefault ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-maintenance">
              <Star className="h-4 w-4 fill-current" aria-hidden="true" />
              {t('languages.default', 'Default')}
            </span>
          ) : (
            // Nút thật có nhãn, không phải icon trần với title.
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSetDefault(language.code)}
              leadingIcon={<Star className="h-4 w-4" aria-hidden="true" />}
            >
              {t('languages.setAsDefault', 'Set as default')}
            </Button>
          ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-24',
        mobile: 'hidden',
        cell: (language) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(language)}
              aria-label={t('languages.editNamed', 'Edit {name}', { name: language.name })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive-tint"
              disabled={language.isDefault}
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  languageCode: language.code,
                  languageName: language.name,
                })
              }
              aria-label={t('languages.deleteNamed', 'Delete {name}', { name: language.name })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    // handleSetDefault/openEdit ổn định giữa các lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  if (loading && languages.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={loadLanguages}
          disabled={loading}
          leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          {t('common.refresh', 'Refresh')}
        </Button>
        <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          {t('languages.addLanguage', 'Add language')}
        </Button>
      </div>

      {loadError && (
        <Alert variant="error" title={t('languages.loadError', 'Could not load the languages')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={loadLanguages}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      )}

      {languages.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title={t('languages.emptyState', 'No languages yet. Add the first one to get started.')}
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              {t('languages.addLanguage', 'Add language')}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={languages}
          rowKey={(language) => language.id}
          caption={t('languages.tableCaption', 'List of languages')}
          isLoading={loading}
          skeletonRows={4}
          rowStatus={(language) => (language.isActive ? 'active' : 'inactive')}
          mobileActions={(language) => (
            <>
              <Button size="sm" variant="outline" onClick={() => openEdit(language)}>
                {t('common.edit', 'Edit')}
              </Button>
              {!language.isDefault && (
                <Button size="sm" variant="ghost" onClick={() => handleSetDefault(language.code)}>
                  {t('languages.setAsDefault', 'Set as default')}
                </Button>
              )}
            </>
          )}
        />
      )}

      {/* Hộp thoại chung: bẫy tiêu điểm, Escape đóng, khoá cuộn nền. */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLanguage
                ? t('languages.editLanguage', 'Edit language')
                : t('languages.addLanguage', 'Add language')}
            </DialogTitle>
            <DialogClose onClose={() => setIsModalOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSubmit} id="language-form">
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {!editingLanguage && (
                <Input
                  label={t('languages.code', 'Code')}
                  required
                  maxLength={10}
                  value={formData.code}
                  onChange={(event) => setFormData({ ...formData, code: event.target.value })}
                  placeholder={t('languages.codePlaceholder', 'e.g. en, vi, fr')}
                  hint={t('languages.codeHint', 'ISO 639-1 language code')}
                />
              )}

              <Input
                label={t('languages.name', 'Name')}
                required
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder={t('languages.namePlaceholder', 'e.g. English')}
              />

              <Input
                label={t('languages.nativeName', 'Native name')}
                required
                value={formData.nativeName}
                onChange={(event) => setFormData({ ...formData, nativeName: event.target.value })}
                placeholder={t('languages.nativeNamePlaceholder', 'e.g. English, Tiếng Việt')}
              />

              {editingLanguage && (
                <label className="flex min-h-touch items-center gap-2.5 text-sm text-ink sm:min-h-0">
                  <Checkbox
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  {t('common.statusActive', 'Active')}
                </label>
              )}

              <label className="flex min-h-touch items-center gap-2.5 text-sm text-ink sm:min-h-0">
                <Checkbox
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                {t('languages.setAsDefault', 'Set as default')}
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={isSaving}
                loadingText={t('common.saving', 'Saving...')}
              >
                {editingLanguage ? t('common.update', 'Update') : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, languageCode: '', languageName: '' })}
        title={t('languages.deleteTitle', 'Delete Language')}
        description={t(
          'languages.deleteMessage',
          'Deleting the language "{name}" ({code}) also deletes every translation belonging to it. This cannot be undone.',
          { name: confirmDialog.languageName, code: confirmDialog.languageCode }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteLanguage}
        variant="destructive"
      />
    </div>
  );
};

export default LanguageManagement;
