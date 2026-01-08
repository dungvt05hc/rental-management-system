import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload, RefreshCw, X, Check, Filter, FileJson } from 'lucide-react';
import { localizationService } from '../../services/localizationService';
import type { UpsertTranslationDto } from '../../services/localizationService';
import type { Language, Translation } from '../../types/localization';
import { AlertDialog } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Translation Management Component
 * Provides full CRUD operations for managing translations across languages
 */
export const TranslationManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState<UpsertTranslationDto>({
    key: '',
    value: '',
    category: 'common',
    description: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    translationKey: string;
  }>({
    open: false,
    translationKey: '',
  });

  /**
   * Load all languages on component mount
   */
  useEffect(() => {
    loadLanguages();
  }, []);

  /**
   * Load translations when language selection changes
   */
  useEffect(() => {
    if (selectedLanguage) {
      loadTranslations(selectedLanguage);
    }
  }, [selectedLanguage]);

  /**
   * Load all active languages
   */
  const loadLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await localizationService.getLanguages();
      setLanguages(data);
      
      // Auto-select default language if available
      const defaultLang = data.find(lang => lang.isDefault);
      if (defaultLang && !selectedLanguage) {
        setSelectedLanguage(defaultLang.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load translations for a specific language
   */
  const loadTranslations = async (languageCode: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await localizationService.getTranslations(languageCode);
      setTranslations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translations');
      setTranslations([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get unique categories from translations
   */
  const categories = useMemo(() => {
    const cats = new Set(translations.map(t => t.category));
    return ['all', ...Array.from(cats).sort()];
  }, [translations]);

  /**
   * Filter translations based on search term and category
   */
  const filteredTranslations = useMemo(() => {
    return translations.filter(translation => {
      const matchesSearch = 
        translation.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        translation.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (translation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesCategory = selectedCategory === 'all' || translation.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [translations, searchTerm, selectedCategory]);

  /**
   * Handle create or update translation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLanguage) {
      setError('Please select a language first');
      return;
    }

    try {
      await localizationService.upsertTranslation(selectedLanguage, formData);
      await loadTranslations(selectedLanguage);
      handleCloseModal();
      showSuccess(t('common.success', 'Success'), t('translations.saveSuccess', 'Translation saved successfully'));
    } catch (err) {
      showError(t('common.error', 'Error'), t('translations.saveError', 'Failed to save translation'));
    }
  };

  /**
   * Handle delete translation
   */
  const handleDeleteTranslation = (key: string) => {
    setConfirmDialog({
      open: true,
      translationKey: key,
    });
  };

  const confirmDeleteTranslation = async () => {
    if (!confirmDialog.translationKey) return;

    try {
      await localizationService.deleteTranslation(selectedLanguage, confirmDialog.translationKey);
      await loadTranslations(selectedLanguage);
      showSuccess(t('common.success', 'Success'), t('translations.deleteSuccess', 'Translation deleted successfully'));
    } catch (err) {
      showError(t('common.error', 'Error'), t('translations.deleteError', 'Failed to delete translation'));
    } finally {
      setConfirmDialog({ open: false, translationKey: '' });
    }
  };

  /**
   * Open modal for creating new translation
   */
  const handleOpenCreateModal = () => {
    setEditingTranslation(null);
    setFormData({
      key: '',
      value: '',
      category: 'common',
      description: '',
    });
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing translation
   */
  const handleOpenEditModal = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      key: translation.key,
      value: translation.value,
      category: translation.category,
      description: translation.description || '',
    });
    setIsModalOpen(true);
  };

  /**
   * Close modal and reset form
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTranslation(null);
    setFormData({
      key: '',
      value: '',
      category: 'common',
      description: '',
    });
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Export translations to JSON
   */
  const handleExportTranslations = () => {
    if (!selectedLanguage || translations.length === 0) return;

    const exportData = {
      languageCode: selectedLanguage,
      exportDate: new Date().toISOString(),
      translations: translations.map(t => ({
        key: t.key,
        value: t.value,
        category: t.category,
        description: t.description,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${selectedLanguage}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle import translations from JSON
   */
  const handleImportTranslations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.translations || !Array.isArray(data.translations)) {
          throw new Error('Invalid translation file format');
        }

        // Convert to bulk format
        const bulkData = {
          languageCode: selectedLanguage,
          translations: data.translations.reduce((acc: Record<string, string>, t: any) => {
            acc[t.key] = t.value;
            return acc;
          }, {}),
        };

        await localizationService.bulkUpsertTranslations(bulkData);
        await loadTranslations(selectedLanguage);
        showSuccess(t('common.success', 'Success'), t('translations.importSuccess', 'Translations imported successfully'));
      } catch (err) {
        showError(t('common.error', 'Error'), t('translations.importError', 'Failed to import translations'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  if (loading && languages.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Translation Management</h2>
          <p className="text-gray-600 mt-1">Manage translations for each language</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => selectedLanguage && loadTranslations(selectedLanguage)}
            disabled={!selectedLanguage}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExportTranslations}
            disabled={!selectedLanguage || translations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer disabled:opacity-50">
            <Upload className="h-4 w-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportTranslations}
              disabled={!selectedLanguage}
              className="hidden"
            />
          </label>
          <button
            onClick={handleOpenCreateModal}
            disabled={!selectedLanguage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Translation
          </button>
        </div>
      </div>

      {/* Language Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Language
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Choose a language --</option>
          {languages.map(lang => (
            <option key={lang.id} value={lang.code}>
              {lang.nativeName} ({lang.code})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {selectedLanguage && (
        <>
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by key, value, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredTranslations.length} of {translations.length} translations
            </div>
          </div>

          {/* Translations Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTranslations.map((translation) => (
                      <tr key={translation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900 max-w-xs truncate">
                          {translation.key}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                          <div className="line-clamp-2">{translation.value}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {translation.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {translation.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(translation)}
                              className="text-blue-600 hover:text-blue-900 transition"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTranslation(translation.key)}
                              className="text-red-600 hover:text-red-900 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredTranslations.length === 0 && (
                  <div className="text-center py-12">
                    <FileJson className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 text-lg mt-4">
                      {searchTerm || selectedCategory !== 'all'
                        ? 'No translations match your filters'
                        : 'No translations found for this language'}
                    </p>
                    {(!searchTerm && selectedCategory === 'all') && (
                      <button
                        onClick={handleOpenCreateModal}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Add your first translation
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {editingTranslation ? 'Edit Translation' : 'Add New Translation'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                  Translation Key *
                </label>
                <input
                  type="text"
                  id="key"
                  name="key"
                  value={formData.key}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingTranslation}
                  placeholder="e.g., common.save, auth.login"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Use dot notation for namespacing (e.g., category.subcategory.key)</p>
              </div>

              <div className="mb-4">
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                  Translation Value *
                </label>
                <textarea
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  placeholder="Enter the translated text..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., common, auth, rooms"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Group related translations together</p>
              </div>

              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Add context or notes for translators..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Check className="h-4 w-4" />
                  {editingTranslation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, translationKey: '' })
        }
        title={t('translations.deleteTitle', 'Delete Translation')}
        description={t(
          'translations.deleteMessage',
          `Are you sure you want to delete the translation "${confirmDialog.translationKey}"?`
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteTranslation}
        variant="destructive"
      />
    </div>
  );
};

export default TranslationManagement;
