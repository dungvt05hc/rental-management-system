import { defineMessage } from '../../utils/i18n';
import type { Message } from '../../utils/i18n';

// Khớp với Identity password policy cấu hình ở Program.cs:
// RequiredLength = 10, RequireUppercase, RequireLowercase, RequireDigit.
// RequireNonAlphanumeric đang tắt nên không liệt kê ở đây.
export interface PasswordRule {
  message: Message;
  isMet: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    message: defineMessage('auth.passwordRuleLength', 'At least 10 characters'),
    isMet: (password) => password.length >= 10
  },
  {
    message: defineMessage('auth.passwordRuleUppercase', 'One uppercase letter'),
    isMet: (password) => /[A-Z]/.test(password)
  },
  {
    message: defineMessage('auth.passwordRuleLowercase', 'One lowercase letter'),
    isMet: (password) => /[a-z]/.test(password)
  },
  {
    message: defineMessage('auth.passwordRuleDigit', 'One number'),
    isMet: (password) => /[0-9]/.test(password)
  }
];

/**
 * Đúng luật mà PASSWORD_RULES mô tả, dưới dạng một vị từ dùng được trong zod
 * schema — để form và danh sách gạch đầu dòng không bao giờ bất đồng ý kiến về
 * việc mật khẩu đã đạt hay chưa.
 */
export function meetsPasswordPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.isMet(password));
}
