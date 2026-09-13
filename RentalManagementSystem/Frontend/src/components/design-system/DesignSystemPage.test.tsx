import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '../../contexts/LocalizationContext';
import { localizationService } from '../../services/localizationService';
import { DesignSystemPage } from './DesignSystemPage';

/**
 * Trang /design-system là chỗ duyệt hệ thống thiết kế bằng mắt. Nó chỉ làm được
 * việc đó nếu nó dựng được. Test này không chấm điểm thẩm mỹ — nó chặn đúng hai
 * kiểu hỏng khiến mở trang ra là màn hình trắng:
 *
 *   - một component bị đổi API mà trang chưa cập nhật theo,
 *   - một lớp nổi (dialog, dropdown) ném lỗi lúc mở.
 *
 * Kèm theo là hai cam kết về khả năng tiếp cận mà mắt thường dễ bỏ sót: ô nhập
 * phải có label thật, và chip trạng thái phải có chữ chứ không chỉ có màu.
 */

beforeEach(() => {
  // Radix đo viewport bằng matchMedia; jsdom không có sẵn.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  window.HTMLElement.prototype.scrollIntoView = () => {};

  vi.spyOn(localizationService, 'getLanguages').mockReturnValue(new Promise(() => {}));
  vi.spyOn(localizationService, 'getTranslationResources').mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <LocalizationProvider>
      <DesignSystemPage />
    </LocalizationProvider>
  );
}

describe('DesignSystemPage', () => {
  it('dựng được đủ năm mục', () => {
    renderPage();

    for (const heading of ['Kiểm tra tương phản', 'Màu', 'Chữ', 'Khoảng cách', 'Component']) {
      expect(
        screen.getByRole('heading', { name: new RegExp(heading, 'i'), level: 2 })
      ).toBeTruthy();
    }
  });

  it('hiện chuỗi tiếng Việt có dấu ở mọi cỡ chữ trong thang', () => {
    renderPage();

    const phrase = 'Phường Bến Nghé, Quận 1 — Đã thanh toán 1.500.000 ₫';
    const samples = screen.getAllByText(phrase);

    // Tám bậc trong thang chữ, mỗi bậc một lần.
    expect(samples.length).toBe(8);

    const classes = samples.map((node) => node.className);
    for (const size of [
      'text-2xs',
      'text-xs',
      'text-sm',
      'text-base',
      'text-lg',
      'text-xl',
      'text-2xl',
      'text-3xl',
    ]) {
      expect(classes, `thiếu mẫu ở cỡ ${size}`).toContain(size);
    }
  });

  it('mọi ô nhập đều có label thật, không chỉ có placeholder', () => {
    renderPage();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(5);

    for (const input of inputs) {
      const id = input.getAttribute('id');
      const labelled =
        input.getAttribute('aria-label') ??
        input.getAttribute('aria-labelledby') ??
        (id ? document.querySelector(`label[for="${id}"]`)?.textContent : null);

      expect(labelled, `ô nhập "${input.getAttribute('placeholder') ?? id}" không có label`).toBeTruthy();
    }
  });

  it('chip trạng thái mang chữ chứ không chỉ mang màu', () => {
    renderPage();

    // Nếu chip chỉ còn là ô màu thì những chuỗi này biến mất — đúng cái khiến
    // hoá đơn in đen trắng và người mù màu đỏ-lục không đọc được trạng thái.
    for (const label of ['Trống', 'Đã thuê', 'Bảo trì', 'Quá hạn', 'Đã thanh toán']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('mở được hộp thoại và đóng lại bằng Escape', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Mở Dialog' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ghi nhận thu tiền — Phòng 201/)).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mở được hộp xác nhận với vai trò alertdialog', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Mở hộp xác nhận' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/Huỷ hoá đơn HD-2026-09-0142\?/)).toBeTruthy();
  });

  it('bảng dữ liệu dựng cả bản desktop và bản thẻ cho mobile', () => {
    renderPage();

    // Bản desktop là <table>, bản mobile là danh sách <article>. Cả hai cùng
    // nằm trong DOM, CSS quyết định cái nào hiện — nên không có đường nào rơi
    // vào cuộn ngang trên điện thoại.
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('article').length).toBeGreaterThan(0);
  });
});
