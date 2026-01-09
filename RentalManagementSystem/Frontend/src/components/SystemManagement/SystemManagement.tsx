import { useState } from 'react';
import { Settings, Globe, Languages } from 'lucide-react';
import { Card, CardContent } from '../ui';
import SystemSettingsTab from './SystemSettingsTab';
import LanguageManagement from '../admin/LanguageManagement';
import TranslationManagement from './TranslationManagement';

const SystemManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'languages' | 'translations'>('settings');
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'languages' as const, label: 'Languages', icon: Globe },
    { id: 'translations' as const, label: 'Translations', icon: Languages },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
        <p className="text-gray-600 mt-1">Manage system settings, languages, and translations</p>
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
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
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
                    <span>{tab.label}</span>
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
