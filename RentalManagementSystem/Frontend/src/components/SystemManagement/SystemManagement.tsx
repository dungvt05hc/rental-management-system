import { useState } from 'react';
import { Settings, Globe, Languages } from 'lucide-react';
import { Card, CardContent } from '../ui';
import SystemSettingsTab from './SystemSettingsTab';
import LanguageManagement from '../admin/LanguageManagement';
import TranslationManagement from './TranslationManagement';
import { useTranslation } from '../../hooks/useTranslation';
import { defineMessage } from '../../utils/i18n';

const SystemManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'settings' | 'languages' | 'translations'>('settings');
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'settings' as const, message: defineMessage('system.tabSettings', 'Settings'), icon: Settings },
    { id: 'languages' as const, message: defineMessage('languages.title', 'Languages'), icon: Globe },
    { id: 'translations' as const, message: defineMessage('translations.title', 'Translations'), icon: Languages },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('system.pageTitle', 'System Management')}</h1>
        <p className="text-gray-600 mt-1">{t('system.subtitle', 'Settings, languages and translations')}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label={t('system.tabs', 'Tabs')}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t(tab.message.key, tab.message.defaultValue)}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'settings' && <SystemSettingsTab />}
        {activeTab === 'languages' && <LanguageManagement />}
        {activeTab === 'translations' && <TranslationManagement />}
      </div>
    </div>
  );
};

export default SystemManagement;
