import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Languages as LanguagesIcon, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilterBar,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import type { DataTableColumn } from '../ui';
import { localizationService } from '../../services/localizationService';
import type { UpsertTranslationDto } from '../../services/localizationService';
import type { Language, Translation } from '../../types/localization';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Quản lý bản dịch.
 *
 * Trang này sửa chính những chuỗi đang hiện trên toàn bộ ứng dụng, nên thứ tự
 * thao tác bắt buộc là: CHỌN NGÔN NGỮ trước, rồi mới tới mọi thứ khác. Giao
 * diện nói thẳng điều đó — chưa chọn ngôn ngữ thì chỉ có đúng ô chọn ngôn ngữ,
 * không phải một loạt nút bị làm mờ như bản cũ. Nút mờ không giải thích được
 * vì sao nó mờ.
 *
 * NĂM CHUỖI TIẾNG ANH VIẾT CỨNG đã sửa: "-- Choose a language --",
 * "All Categories", "Showing X of Y translations",
 * "Please select a language first", "Invalid translation file format".
 *
 * Hộp thoại thêm/sửa chuyển từ div dựng tay sang Dialog chung — cùng lý do đã
 * ghi ở LanguageManagement: bẫy tiêu điểm, Escape, khoá cuộn nền, aria-modal.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Một dòng trong file JSON import. File ngoài chỉ cần đúng hai field này. */
type ImportedTranslation = { key: string; value: string };

const isImportedTranslation = (entry: unknown): entry is ImportedTranslation =>
  typeof entry === 'object' &&
  entry !== null &&
  typeof (entry as ImportedTranslation).key === 'string' &&
  typeof (entry as ImportedTranslation).value === 'string';

const ALL = 'all';

const EMPTY_FORM: UpsertTranslationDto = {
  key: '',
  value: '',
  category: 'common',
  description: '',
};

export const TranslationManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [formData, setFormData] = useState<UpsertTranslationDto>(EMPTY_FORM);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; translationKey: string }>({
    open: false,
    translationKey: '',
  });

  const searchTerm = useDebounce(searchInput, 250);

  const loadLanguages = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await localizationService.getLanguages();
      setLanguages(data);

      // Tự chọn ngôn ngữ mặc định để trang không mở ra ở trạng thái rỗng.
      const defaultLanguage = data.find((language) => language.isDefault);
      if (defaultLanguage) {
        setSelectedLanguage((current) => current || defaultLanguage.code);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : t('languages.loadError', 'Could not load the languages')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTranslations = useCallback(
    async (languageCode: string) => {
      try {
        setLoading(true);
        setLoadError(null);
        setTranslations(await localizationService.getTranslations(languageCode));
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : t('translations.loadError', 'Could not load the translations')
        );
        setTranslations([]);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    if (selectedLanguage) loadTranslations(selectedLanguage);
  }, [selectedLanguage, loadTranslations]);

  const categories = useMemo(() => {
    const unique = new Set(translations.map((translation) => translation.category));
    return [ALL, ...[...unique].sort()];
  }, [translations]);

  const filteredTranslations = useMemo(() => {
    const needle = searchTerm.toLowerCase();
    return translations.filter((translation) => {
      const matchesSearch =
        translation.key.toLowerCase().includes(needle) ||
        translation.value.toLowerCase().includes(needle) ||
        (translation.description?.toLowerCase().includes(needle) ?? false);
      const matchesCategory =
        selectedCategory === ALL || translation.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [translations, searchTerm, selectedCategory]);

  const isFiltered = searchTerm.trim() !== '' || selectedCategory !== ALL;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLanguage) return;

    setIsSaving(true);
    try {
      await localizationService.upsertTranslation(selectedLanguage, formData);
      await loadTranslations(selectedLanguage);
      setIsModalOpen(false);
      setEditingTranslation(null);
      setFormData(EMPTY_FORM);
      showSuccess(
        t('common.success', 'Success'),
        t('translations.saveSuccess', 'Translation saved successfully')
      );
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('translations.saveError', 'Failed to save translation')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteTranslation = async () => {
    if (!confirmDialog.translationKey) return;

    try {
      await localizationService.deleteTranslation(selectedLanguage, confirmDialog.translationKey);
      await loadTranslations(selectedLanguage);
      showSuccess(
        t('common.success', 'Success'),
        t('translations.deleteSuccess', 'Translation deleted successfully')
      );
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error
          ? err.message
          : t('translations.deleteError', 'Failed to delete translation')
      );
    } finally {
      setConfirmDialog({ open: false, translationKey: '' });
    }
  };

  const openEdit = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      key: translation.key,
      value: translation.value,
      category: translation.category,
      description: translation.description || '',
    });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingTranslation(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    if (!selectedLanguage || translations.length === 0) return;

    const exportData = {
      languageCode: selectedLanguage,
      exportDate: new Date().toISOString(),
      translations: translations.map((translation) => ({
        key: translation.key,
        value: translation.value,
        category: translation.category,
        description: translation.description,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `translations-${selectedLanguage}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loaded) => {
      try {
        const data: unknown = JSON.parse(loaded.target?.result as string);

        // File do người dùng tải lên nên không tin được shape — phải kiểm tra
        // từng phần tử, không chỉ kiểm tra là mảng. Trước đây một phần tử
        // thiếu key/value sẽ lọt vào và tạo ra entry "undefined".
        const entries = (data as { translations?: unknown } | null)?.translations;
        if (!Array.isArray(entries) || !entries.every(isImportedTranslation)) {
          throw new Error(t('translations.invalidFile', 'That file is not a translation export'));
        }

        await localizationService.bulkUpsertTranslations({
          languageCode: selectedLanguage,
          translations: entries.reduce<Record<string, string>>((accumulator, entry) => {
            accumulator[entry.key] = entry.value;
            return accumulator;
          }, {}),
        });
        await loadTranslations(selectedLanguage);
        showSuccess(
          t('common.success', 'Success'),
          t('translations.importSuccess', 'Translations imported successfully')
        );
      } catch (err) {
        showError(
          t('common.error', 'Error'),
          err instanceof Error
            ? err.message
            : t('translations.importError', 'Failed to import translations')
        );
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const columns: DataTableColumn<Translation>[] = useMemo(
    () => [
      {
        key: 'key',
        header: t('translations.key', 'Key'),
        cell: (translation) => (
          <div className="min-w-0">
            <span className="block truncate font-mono text-sm font-medium text-ink">
              {translation.key}
            </span>
            {translation.description && (
              <span className="block truncate text-xs text-ink-muted">
                {translation.description}
              </span>
            )}
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'value',
        header: t('translations.value', 'Text'),
        cell: (translation) => <span className="block">{translation.value}</span>,
      },
      {
        key: 'category',
        header: t('items.category', 'Category'),
        cell: (translation) => (
          <Badge variant="secondary" size="sm">
            {translation.category}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-36',
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-24',
        mobile: 'hidden',
        cell: (translation) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(translation)}
              aria-label={t('translations.editNamed', 'Edit {key}', { key: translation.key })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive-tint"
              onClick={() => setConfirmDialog({ open: true, translationKey: translation.key })}
              aria-label={t('translations.deleteNamed', 'Delete {key}', { key: translation.key })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  if (loading && languages.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chọn ngôn ngữ là bước BẮT BUỘC ĐẦU TIÊN, nên nó đứng một mình. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label
            htmlFor="translation-language"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            {t('translations.selectLanguage', 'Language')}
          </label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger id="translation-language" className="w-64">
              <SelectValue placeholder={t('translations.chooseLanguage', 'Choose a language')} />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.id} value={language.code}>
                  {language.nativeName} ({language.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Các nút chỉ xuất hiện khi đã chọn ngôn ngữ — không bày ra rồi làm mờ. */}
        {selectedLanguage && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => loadTranslations(selectedLanguage)}
              disabled={loading}
              leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            >
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={translations.length === 0}
              leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            >
              {t('system.export', 'Export')}
            </Button>
            {/* <label> bọc input file: giữ được kiểu nút mà vẫn là control thật. */}
            <label className="focus-within:outline-ring inline-flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-surface px-4 text-sm font-medium text-ink transition-colors duration-100 hover:bg-secondary sm:min-h-10">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t('translations.import', 'Import')}
              <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
            </label>
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              {t('translations.addTranslation', 'Add translation')}
            </Button>
          </div>
        )}
      </div>

      {loadError && (
        <Alert variant="error" title={t('translations.loadError', 'Could not load the translations')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            {selectedLanguage && (
              <Button size="sm" variant="outline" onClick={() => loadTranslations(selectedLanguage)}>
                {t('common.tryAgain', 'Try Again')}
              </Button>
            )}
          </div>
        </Alert>
      )}

      {!selectedLanguage ? (
        <EmptyState
          icon={<LanguagesIcon className="h-8 w-8" />}
          title={t('translations.pickLanguageTitle', 'Choose a language first')}
          description={t(
            'translations.pickLanguageBody',
            'Translations belong to one language. Pick one above to see and edit its wording.'
          )}
        />
      ) : (
        <>
          <FilterBar>
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('translations.searchPlaceholder', 'Search by key, text or description...')}
              prefix={<Search className="h-4 w-4" aria-hidden="true" />}
              aria-label={t('translations.searchPlaceholder', 'Search translations')}
              containerClassName="sm:flex-1"
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="sm:w-52" aria-label={t('items.category', 'Category')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === ALL ? t('items.allCategories', 'All categories') : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>

          {!loading && filteredTranslations.length === 0 ? (
            isFiltered ? (
              <EmptyState
                icon={<Search className="h-8 w-8" />}
                title={t('translations.noMatchTitle', 'No translation matches this filter')}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchInput('');
                      setSelectedCategory(ALL);
                    }}
                  >
                    {t('common.clearFilters', 'Clear filters')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<LanguagesIcon className="h-8 w-8" />}
                title={t('translations.empty', 'This language has no translations yet')}
                description={t(
                  'translations.emptyBody',
                  'Add them one at a time, or import a JSON file exported from another language.'
                )}
                action={
                  <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                    {t('translations.addTranslation', 'Add translation')}
                  </Button>
                }
              />
            )
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={filteredTranslations}
                rowKey={(translation) => translation.key}
                caption={t('translations.title', 'Translations')}
                isLoading={loading}
                skeletonRows={8}
                mobileActions={(translation) => (
                  <Button size="sm" variant="outline" onClick={() => openEdit(translation)}>
                    {t('common.edit', 'Edit')}
                  </Button>
                )}
              />

              <p className="text-sm text-ink-muted" role="status">
                {t('translations.showingCount', 'Showing {shown} of {total} translations', {
                  shown: filteredTranslations.length,
                  total: translations.length,
                })}
              </p>
            </>
          )}
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTranslation
                ? t('translations.editTranslation', 'Edit translation')
                : t('translations.addTranslation', 'Add translation')}
            </DialogTitle>
            <DialogClose onClose={() => setIsModalOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <Input
                label={t('translations.key', 'Key')}
                required
                value={formData.key}
                onChange={(event) => setFormData({ ...formData, key: event.target.value })}
                // Khoá là định danh, sửa nó trên một bản dịch đã có nghĩa là tạo
                // ra một khoá mới và bỏ lại khoá cũ mồ côi.
                readOnly={Boolean(editingTranslation)}
                placeholder={t('translations.keyPlaceholder', 'e.g. rooms.title')}
                className="font-mono"
              />

              <div>
                <label
                  htmlFor="translation-value"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  {t('translations.value', 'Text')}
                  <span aria-hidden="true" className="ml-0.5 text-destructive">
                    *
                  </span>
                </label>
                <textarea
                  id="translation-value"
                  required
                  rows={3}
                  value={formData.value}
                  onChange={(event) => setFormData({ ...formData, value: event.target.value })}
                  className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
                />
              </div>

              <Input
                label={t('items.category', 'Category')}
                required
                value={formData.category}
                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                placeholder="common"
              />

              <Input
                label={t('items.description', 'Description')}
                value={formData.description ?? ''}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                hint={t('translations.descriptionHint', 'Where this text appears, for the next translator.')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" isLoading={isSaving} loadingText={t('common.saving', 'Saving...')}>
                {t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, translationKey: '' })}
        title={t('translations.deleteTitle', 'Delete translation')}
        description={t('translations.deleteMessage', 'Delete the translation "{key}"?', {
          key: confirmDialog.translationKey,
        })}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteTranslation}
        variant="destructive"
      />
    </div>
  );
};

export default TranslationManagement;
