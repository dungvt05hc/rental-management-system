import { useId, useState } from 'react';
import { Globe, Languages, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '../ui';
import SystemSettingsTab from './SystemSettingsTab';
import LanguageManagement from '../admin/LanguageManagement';
import TranslationManagement from './TranslationManagement';
import { useTranslation } from '../../hooks/useTranslation';
import { defineMessage } from '../../utils/i18n';
import type { Message } from '../../utils/i18n';

/* ═══════════════════════════════════════════════════════════════════════════
 * Quản trị hệ thống — khung ba thẻ.
 *
 * Thẻ dùng cùng một kiểu nút phân đoạn với trang Báo cáo: viền + nền tint khi
 * đang chọn. Bản cũ dùng gạch chân xanh dưới chữ, nhưng đặt trong một <Card>
 * có viền bao quanh nên trông như một thanh công cụ chứ không như thẻ.
 *
 * Bỏ state `error` ở đây: nó được khai báo và render ra một hộp đỏ, nhưng KHÔNG
 * có chỗ nào gọi setError. Lỗi thật đều do từng thẻ con tự xử lý và báo qua
 * toast, nên hộp đỏ này chưa bao giờ hiện ra.
 *
 * Thêm role="tablist"/"tab"/"tabpanel" với aria-controls: trình đọc màn hình
 * cần biết ba nút này điều khiển cùng một vùng nội dung, không phải ba nút rời.
 * ═══════════════════════════════════════════════════════════════════════════ */

type TabId = 'settings' | 'languages' | 'translations';

const TABS: Array<{ id: TabId; message: Message; Icon: LucideIcon }> = [
  { id: 'settings', message: defineMessage('system.tabSettings', 'Settings'), Icon: Settings },
  { id: 'languages', message: defineMessage('languages.title', 'Languages'), Icon: Globe },
  { id: 'translations', message: defineMessage('translations.title', 'Translations'), Icon: Languages },
];

const SystemManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const panelId = useId();

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('system.pageTitle', 'System Management')}
        description={t('system.subtitle', 'Settings, languages and translations')}
      />

      <div
        role="tablist"
        aria-label={t('system.tabs', 'Tabs')}
        className="flex flex-wrap gap-2 border-b border-line pb-3"
      >
        {TABS.map(({ id, message, Icon }) => {
          const isSelected = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              onClick={() => setActiveTab(id)}
              className={`focus-ring inline-flex min-h-touch items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-100 sm:min-h-10 ${
                isSelected
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-input bg-surface text-ink hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(message.key, message.defaultValue)}
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel">
        {activeTab === 'settings' && <SystemSettingsTab />}
        {activeTab === 'languages' && <LanguageManagement />}
        {activeTab === 'translations' && <TranslationManagement />}
      </div>
    </div>
  );
};

export default SystemManagement;
