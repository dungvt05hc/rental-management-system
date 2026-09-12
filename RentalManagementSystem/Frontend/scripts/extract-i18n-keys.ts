/**
 * Trích xuất khoá i18n từ mã nguồn bằng AST (ts-morph).
 *
 * Vì sao AST chứ không phải regex: trong src có hàng chục lời gọi t() trải trên
 * nhiều dòng (`description={t(\n  'key',\n  'default'\n)}`) và cả template
 * literal. Regex một dòng bỏ sót toàn bộ nhóm này — đó chính là lý do độ phủ
 * trước đây bị báo sai.
 *
 *   npm run i18n:extract   → ghi lại locales/en.json, in ra khoá thiếu bản dịch vi
 *   npm run i18n:check     → không ghi gì, exit 1 nếu có khoá thiếu (dùng trong CI)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { CallExpression, SourceFile } from 'ts-morph';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const localesDir = resolve(frontendRoot, 'locales');
const enPath = resolve(localesDir, 'en.json');
const viPath = resolve(localesDir, 'vi.json');

/** Khoá hợp lệ: `category.name` hoặc `category.sub.name`, không dấu, không khoảng trắng. */
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/;

interface ExtractedKey {
  key: string;
  defaultValue: string;
  /** Nơi bắt gặp đầu tiên, dạng `path/file.tsx:12`. */
  location: string;
}

interface Problem {
  location: string;
  detail: string;
}

interface ExtractionResult {
  keys: Map<string, ExtractedKey>;
  /** Lời gọi t() mà khoá không phải hằng chuỗi — không kiểm tra tĩnh được. */
  dynamicKeys: Problem[];
  /** Cùng một khoá nhưng default value khác nhau ở hai chỗ. */
  conflicts: Problem[];
  /** t() thiếu default value. */
  missingDefaults: Problem[];
}

/**
 * Đọc giá trị chuỗi tĩnh của một node đối số.
 * Nhận string literal và template literal không có phần thay thế; trả null cho
 * mọi thứ khác (biến, nối chuỗi, template có ${}).
 */
function staticStringValue(node: Node | undefined): string | null {
  if (!node) return null;
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralValue();
  }
  return null;
}

/** Tên hàm được gọi: `t` cho `t(...)`, `x.t` cho `x.t(...)`. */
function calleeName(call: CallExpression): string | null {
  const expression = call.getExpression();
  if (Node.isIdentifier(expression)) return expression.getText();
  if (Node.isPropertyAccessExpression(expression)) return expression.getName();
  return null;
}

function locationOf(sourceFile: SourceFile, node: Node): string {
  const path = relative(frontendRoot, sourceFile.getFilePath());
  const line = sourceFile.getLineAndColumnAtPos(node.getStart()).line;
  return `${path}:${line}`;
}

function extract(): ExtractionResult {
  const project = new Project({
    tsConfigFilePath: resolve(frontendRoot, 'tsconfig.app.json'),
    skipAddingFilesFromTsConfig: true,
  });
  // Bỏ file test: chúng cố tình dùng khoá không tồn tại để kiểm tra đường dự
  // phòng, và những khoá đó không bao giờ hiện ra cho người dùng.
  project.addSourceFilesAtPaths([
    resolve(frontendRoot, 'src/**/*.ts'),
    resolve(frontendRoot, 'src/**/*.tsx'),
    `!${resolve(frontendRoot, 'src/**/*.test.ts')}`,
    `!${resolve(frontendRoot, 'src/**/*.test.tsx')}`,
    `!${resolve(frontendRoot, 'src/**/*.spec.ts')}`,
    `!${resolve(frontendRoot, 'src/**/*.spec.tsx')}`,
  ]);

  const result: ExtractionResult = {
    keys: new Map(),
    dynamicKeys: [],
    conflicts: [],
    missingDefaults: [],
  };

  for (const sourceFile of project.getSourceFiles()) {
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      // Ba cách khai báo một chuỗi cần dịch, extractor coi như nhau:
      //   t()             — trong component, qua hook
      //   translate()     — ngoài cây React (tầng service, schema zod)
      //   defineMessage() — trong bảng hằng nằm ngoài component
      const callee = calleeName(call);
      if (callee !== 't' && callee !== 'translate' && callee !== 'defineMessage') continue;

      const args = call.getArguments();
      if (args.length === 0) continue;

      const key = staticStringValue(args[0]);

      if (key === null) {
        result.dynamicKeys.push({
          location: locationOf(sourceFile, call),
          detail: call.getText().replace(/\s+/g, ' ').slice(0, 80),
        });
        continue;
      }

      // Lọc các hàm khác cũng tên `t` (ví dụ callback trong .map). Khoá dịch
      // trong dự án này luôn có dạng `category.name`.
      if (!KEY_PATTERN.test(key)) continue;

      const location = locationOf(sourceFile, call);
      const defaultValue = staticStringValue(args[1]);

      if (defaultValue === null) {
        result.missingDefaults.push({
          location,
          detail: `t('${key}', …) thiếu default value dạng hằng chuỗi`,
        });
        continue;
      }

      const existing = result.keys.get(key);
      if (!existing) {
        result.keys.set(key, { key, defaultValue, location });
      } else if (existing.defaultValue !== defaultValue) {
        result.conflicts.push({
          location,
          detail: `'${key}' có hai default value: "${existing.defaultValue}" (${existing.location}) và "${defaultValue}"`,
        });
      }
    }
  }

  return result;
}

function readLocale(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${relative(frontendRoot, path)} không phải một object JSON phẳng`);
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      throw new Error(`${relative(frontendRoot, path)}: khoá "${key}" phải có giá trị là chuỗi`);
    }
    out[key] = value;
  }
  return out;
}

/** JSON phẳng, khoá sắp xếp — để diff giữa các lần chạy luôn tối thiểu. */
function serialize(entries: Record<string, string>): string {
  const sorted = Object.keys(entries).sort();
  const body = sorted.map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key])}`);
  return `{\n${body.join(',\n')}\n}\n`;
}

function list(title: string, lines: string[], limit = 40): void {
  console.log(`\n${title}`);
  for (const line of lines.slice(0, limit)) console.log(`  ${line}`);
  if (lines.length > limit) console.log(`  … và ${lines.length - limit} dòng nữa`);
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const { keys, dynamicKeys, conflicts, missingDefaults } = extract();

  const codeKeys = [...keys.keys()].sort();
  const enFromCode: Record<string, string> = {};
  for (const key of codeKeys) enFromCode[key] = keys.get(key)!.defaultValue;

  const vi = readLocale(viPath);
  const enOnDisk = readLocale(enPath);

  const missingVi = codeKeys.filter((key) => !vi[key]?.trim());
  const orphanVi = Object.keys(vi).filter((key) => !(key in enFromCode)).sort();
  const enStale = serialize(enOnDisk) !== serialize(enFromCode);

  const errors: string[] = [];

  console.log(`Quét src/ → ${codeKeys.length} khoá i18n từ ${keys.size} lời gọi t() có khoá tĩnh.`);

  if (!checkOnly) {
    writeFileSync(enPath, serialize(enFromCode), 'utf8');
    console.log(`Đã ghi ${relative(frontendRoot, enPath)} (${codeKeys.length} khoá).`);
  } else if (enStale) {
    errors.push(
      `locales/en.json lệch với mã nguồn — chạy \`npm run i18n:extract\` rồi commit lại.`,
    );
  }

  if (conflicts.length > 0) {
    list(
      `LỖI: ${conflicts.length} khoá có default value mâu thuẫn:`,
      conflicts.map((p) => `${p.location} — ${p.detail}`),
    );
    errors.push(`${conflicts.length} khoá có default value mâu thuẫn giữa các file.`);
  }

  if (missingDefaults.length > 0) {
    list(
      `LỖI: ${missingDefaults.length} lời gọi t() thiếu default value:`,
      missingDefaults.map((p) => `${p.location} — ${p.detail}`),
    );
    errors.push(`${missingDefaults.length} lời gọi t() thiếu default value.`);
  }

  if (dynamicKeys.length > 0) {
    list(
      `CẢNH BÁO: ${dynamicKeys.length} lời gọi t() nhận khoá qua biến. ` +
        `Khoá phải được khai báo bằng defineMessage() ở nơi khác, nếu không nó sẽ lọt lưới kiểm tra:`,
      dynamicKeys.map((p) => `${p.location} — ${p.detail}`),
    );
  }

  if (orphanVi.length > 0) {
    list(
      `CẢNH BÁO: ${orphanVi.length} khoá có trong vi.json nhưng không còn dùng trong code:`,
      orphanVi,
    );
  }

  if (missingVi.length > 0) {
    list(`LỖI: ${missingVi.length} khoá thiếu bản dịch tiếng Việt:`, missingVi);
    errors.push(`${missingVi.length} khoá thiếu bản dịch trong locales/vi.json.`);
  }

  const coverage = codeKeys.length === 0 ? 100 : ((codeKeys.length - missingVi.length) / codeKeys.length) * 100;
  console.log(
    `\nĐộ phủ tiếng Việt: ${(codeKeys.length - missingVi.length)}/${codeKeys.length} (${coverage.toFixed(1)}%)`,
  );

  if (errors.length > 0) {
    console.error(`\n✗ i18n check thất bại:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log('✓ i18n OK.');
}

main();
