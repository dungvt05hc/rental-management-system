import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Star, Check, X, RefreshCw } from 'lucide-react';
import { localizationService } from '../../services/localizationService';
import type { CreateLanguageDto, UpdateLanguageDto } from '../../services/localizationService';
import type { Language } from '../../types/localization';
import { AlertDialog } from '../ui';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

/**
 * Language Management Component
 * Provides full CRUD operations for managing languages
 */
export const LanguageManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [formData, setFormData] = useState<CreateLanguageDto | UpdateLanguageDto>({
    code: '',
    name: '',
    nativeName: '',
    isDefault: false,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    languageCode: string;
    languageName: string;
  }>({
    open: false,
    languageCode: '',
    languageName: '',
  });

  /**
   * Load all languages including inactive ones
   */
  const loadLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await localizationService.getAllLanguages();
      setLanguages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  /**
   * Handle create new language
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await localizationService.createLanguage(formData as CreateLanguageDto);
      await loadLanguages();
      handleCloseModal();
      showSuccess(t('common.success', 'Success'), t('languages.createSuccess', 'Language created successfully'));
    } catch (err) {
      showError(t('common.error', 'Error'), t('languages.createError', 'Failed to create language'));
    }
  };

  /**
   * Handle update language
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLanguage) return;

    try {
      await localizationService.updateLanguage(
        editingLanguage.code,
        formData as UpdateLanguageDto
      );
      await loadLanguages();
      handleCloseModal();
      showSuccess(t('common.success', 'Success'), t('languages.updateSuccess', 'Language updated successfully'));
    } catch (err) {
      showError(t('common.error', 'Error'), t('languages.updateError', 'Failed to update language'));
    }
  };

  /**
   * Handle delete language
   */
  const handleDeleteLanguage = (code: string, name: string) => {
    setConfirmDialog({
      open: true,
      languageCode: code,
      languageName: name,
    });
  };

  const confirmDeleteLanguage = async () => {
    if (!confirmDialog.languageCode) return;

    try {
      await localizationService.deleteLanguage(confirmDialog.languageCode);
      showSuccess(t('common.success', 'Success'), t('languages.deleteSuccess', 'Language deleted successfully'));
      loadLanguages();
    } catch (error) {
      showError(t('common.error', 'Error'), t('languages.deleteError', 'Failed to delete language'));
    }
  };

  /**
   * Handle set default language
   */
  const handleSetDefault = async (code: string) => {
    try {
      await localizationService.setDefaultLanguage(code);
      await loadLanguages();
      showSuccess(t('common.success', 'Success'), t('languages.setDefaultSuccess', 'Default language set successfully'));
    } catch (err) {
      showError(t('common.error', 'Error'), t('languages.setDefaultError', 'Failed to set default language'));
    }
  };

  /**
   * Open modal for creating new language
   */
  const handleOpenCreateModal = () => {
    setEditingLanguage(null);
    setFormData({
      code: '',
      name: '',
      nativeName: '',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing language
   */
  const handleOpenEditModal = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      name: language.name,
      nativeName: language.nativeName,
      isDefault: language.isDefault,
      isActive: language.isActive,
    } as UpdateLanguageDto);
    setIsModalOpen(true);
  };

  /**
   * Close modal and reset form
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLanguage(null);
    setFormData({
      code: '',
      name: '',
      nativeName: '',
      isDefault: false,
    });
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Language Management</h1>
        <div className="flex gap-2">
          <button
            onClick={loadLanguages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Language
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Native Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {languages.map((language) => (
              <tr key={language.id} className={`hover:bg-gray-50 ${!language.isActive ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {language.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {language.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {language.nativeName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      language.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {language.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {language.isDefault ? (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <Star className="h-4 w-4 fill-yellow-600" />
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(language.code)}
                      className="text-gray-400 hover:text-yellow-600 transition"
                      title="Set as default"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditModal(language)}
                      className="text-blue-600 hover:text-blue-900 transition"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLanguage(language.code, language.name)}
                      className="text-red-600 hover:text-red-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                      disabled={language.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {languages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No languages found. Add your first language to get started.</p>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {editingLanguage ? 'Edit Language' : 'Add New Language'}
            </h2>

            <form onSubmit={editingLanguage ? handleUpdate : handleCreate}>
              {!editingLanguage && (
                <div className="mb-4">
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    Language Code *
                  </label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={(formData as CreateLanguageDto).code || ''}
                    onChange={handleInputChange}
                    required
                    maxLength={10}
                    placeholder="e.g., en, vi, fr"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">ISO 639-1 language code</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Language Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., English"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="nativeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Native Name *
                </label>
                <input
                  type="text"
                  id="nativeName"
                  name="nativeName"
                  value={formData.nativeName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., English, Tiếng Việt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingLanguage && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={(formData as UpdateLanguageDto).isActive}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
              )}

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">Set as Default Language</span>
                </label>
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
                  {editingLanguage ? 'Update' : 'Create'}
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
          setConfirmDialog({ open, languageCode: '', languageName: '' })
        }
        title={t('languages.deleteTitle', 'Delete Language')}
        description={t(
          'languages.deleteMessage',
          `Are you sure you want to delete the language "${confirmDialog.languageName}" (${confirmDialog.languageCode})? This will also delete all associated translations.`
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
