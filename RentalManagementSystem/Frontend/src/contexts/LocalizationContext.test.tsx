import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LocalizationProvider } from './LocalizationContext';
import { useTranslation } from '../hooks/useTranslation';
import { localizationService } from '../services/localizationService';
import { translate } from '../utils/i18n';

/**
 * Điều được bảo vệ ở đây: giao diện vẫn ra tiếng Việt khi API không trả lời.
 *
 * Trước đây context phụ thuộc hoàn toàn vào API — backend tắt là mất sạch chữ,
 * rơi về chuỗi tiếng Anh viết trong code. Bảng dịch đóng sẵn trong bundle là lớp
 * nền, API chỉ ghi đè lên.
 */

function Probe() {
  const { t } = useTranslation();

  return (
    <ul>
      <li data-testid="rooms">{t('rooms.title', 'Rooms')}</li>
      <li data-testid="dashboard">{t('dashboard.title', 'Dashboard')}</li>
      <li data-testid="deposit">{t('contracts.securityDeposit', 'Deposit')}</li>
      <li data-testid="interpolated">
        {t('rooms.roomLabel', 'Room {number}', { number: '101' })}
      </li>
      <li data-testid="unknown">{t('nope.notAKey', 'English fallback')}</li>
    </ul>
  );
}

function renderProbe() {
  return render(
    <LocalizationProvider>
      <Probe />
    </LocalizationProvider>
  );
}

describe('LocalizationProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Vitest chạy không bật `globals`, nên testing-library không tự dọn DOM
    // giữa các test — thiếu bước này, render của test trước còn lại và
    // getByTestId thấy hai phần tử trùng id.
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows Vietnamese from the bundle when the API is unreachable', async () => {
    vi.spyOn(localizationService, 'getLanguages').mockRejectedValue(new Error('offline'));
    vi.spyOn(localizationService, 'getTranslationResources').mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProbe();

    expect(screen.getByTestId('rooms').textContent).toBe('Phòng');
    expect(screen.getByTestId('dashboard').textContent).toBe('Tổng quan');
    expect(screen.getByTestId('deposit').textContent).toBe('Tiền cọc');

    // Và vẫn là tiếng Việt sau khi các lời gọi API hỏng đã settle.
    await waitFor(() => {
      expect(screen.getByTestId('rooms').textContent).toBe('Phòng');
    });
  });

  it('renders Vietnamese on the very first paint, before any request settles', () => {
    vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
    vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));

    renderProbe();

    expect(screen.getByTestId('rooms').textContent).toBe('Phòng');
  });

  it('lets the API override the bundled wording', async () => {
    vi.spyOn(localizationService, 'getLanguages').mockResolvedValue([
      { id: 1, code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', isDefault: true, isActive: true },
    ]);
    vi.spyOn(localizationService, 'getTranslationResources').mockResolvedValue({
      languageCode: 'vi',
      resources: { rooms: { 'rooms.title': 'Phòng trọ' } },
    });

    renderProbe();

    await waitFor(() => {
      expect(screen.getByTestId('rooms').textContent).toBe('Phòng trọ');
    });

    // Khoá API không trả về vẫn lấy từ bundle, không rơi về tiếng Anh.
    expect(screen.getByTestId('dashboard').textContent).toBe('Tổng quan');
  });

  it('ignores an empty value from the API rather than blanking the label', async () => {
    vi.spyOn(localizationService, 'getLanguages').mockResolvedValue([
      { id: 1, code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', isDefault: true, isActive: true },
    ]);
    vi.spyOn(localizationService, 'getTranslationResources').mockResolvedValue({
      languageCode: 'vi',
      resources: { rooms: { 'rooms.title': '   ' } },
    });

    renderProbe();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard').textContent).toBe('Tổng quan');
    });
    expect(screen.getByTestId('rooms').textContent).toBe('Phòng');
  });

  it('substitutes parameters into the translated string', () => {
    vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
    vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));

    renderProbe();

    expect(screen.getByTestId('interpolated').textContent).toBe('Phòng 101');
  });

  it('falls back to the English default for a key nothing defines', () => {
    vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
    vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));

    renderProbe();

    expect(screen.getByTestId('unknown').textContent).toBe('English fallback');
  });

  it('serves the same translations to code outside React', async () => {
    vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
    vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));

    renderProbe();

    // api.ts và các schema zod dịch qua đường này.
    await waitFor(() => {
      expect(translate('rooms.title', 'Rooms')).toBe('Phòng');
    });
  });

  it('honours a stored language preference over the default', async () => {
    localStorage.setItem('preferred_language', 'en');
    vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
    vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));

    renderProbe();

    expect(screen.getByTestId('rooms').textContent).toBe('Rooms');
  });
});
