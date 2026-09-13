import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, contrastRatio, perceivedLightness } from './contrast';

/**
 * Sàn tương phản của hệ thống thiết kế, kiểm ngay trên src/index.css.
 *
 * Trang /design-system đo cùng danh sách này trong trình duyệt, nhưng trang thì
 * phải có người mở mới biết. Test này chặn ngay lúc chạy CI: hạ một màu xuống
 * dưới ngưỡng AA là đỏ, kèm tên cặp màu và số đo được.
 */

// vitest chạy với cwd là thư mục Frontend (nơi có package.json). Không dùng
// import.meta.url vì trong môi trường jsdom nó không phải URL scheme file:.
const CSS = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Bóc các custom property màu trong khối @theme. */
function readTokens(): Record<string, string> {
  const theme = CSS.slice(CSS.indexOf('@theme {'));
  const tokens: Record<string, string> = {};
  for (const match of theme.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const tokens = readTokens();

describe('token màu', () => {
  it('đọc được toàn bộ token màu từ @theme', () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(20);
  });

  it('có đủ năm token trạng thái nghiệp vụ', () => {
    for (const name of [
      '--color-status-available',
      '--color-status-occupied',
      '--color-status-maintenance',
      '--color-status-overdue',
      '--color-status-paid',
    ]) {
      expect(tokens[name], `thiếu ${name}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('tương phản WCAG AA', () => {
  it.each(CONTRAST_PAIRS.map((pair) => [pair[0], pair] as const))(
    '%s',
    (_label, [label, fgToken, bgToken, required]) => {
      const foreground = tokens[fgToken];
      const background = tokens[bgToken];

      expect(foreground, `không tìm thấy token ${fgToken}`).toBeDefined();
      expect(background, `không tìm thấy token ${bgToken}`).toBeDefined();

      const ratio = contrastRatio(foreground, background);
      expect(
        ratio,
        `${label}: ${foreground} trên ${background} chỉ đạt ${ratio.toFixed(2)}:1, cần ${required}:1`
      ).toBeGreaterThanOrEqual(required);
    }
  );
});

describe('giới hạn đã biết của bảng màu trạng thái', () => {
  /*
   * Đây không phải test đòi sửa gì — nó khoá lại một sự thật để đừng ai gỡ icon
   * khỏi chip trạng thái.
   *
   * Ràng buộc "chữ trắng phải đạt 4.5:1" ép cả năm màu vào một dải sáng rất
   * hẹp. Nếu dải đó rộng ra đáng kể thì tức là có màu vừa bị hạ tương phản —
   * và test tương phản bên trên sẽ bắt được. Nếu nó vẫn hẹp thì icon trên chip
   * vẫn là bắt buộc: in đen trắng và mắt mù màu đỏ-lục không phân biệt được
   * năm ô gần cùng độ xám.
   */
  it('năm màu trạng thái nằm trong một dải sáng hẹp, nên màu một mình không đủ', () => {
    const lightness = [
      '--color-status-available',
      '--color-status-occupied',
      '--color-status-maintenance',
      '--color-status-overdue',
      '--color-status-paid',
    ].map((name) => perceivedLightness(tokens[name]));

    const spread = Math.max(...lightness) - Math.min(...lightness);
    expect(spread).toBeLessThan(20);
  });
});
