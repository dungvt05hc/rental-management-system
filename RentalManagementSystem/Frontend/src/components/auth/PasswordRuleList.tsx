import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from './passwordPolicy';
import { useTranslation } from '../../hooks/useTranslation';

interface PasswordRuleListProps {
  password: string;
}

/**
 * Chỉ báo độ mạnh mật khẩu: từng luật một, tick khi đạt.
 * Hiện luật ngay từ đầu chứ không đợi submit, vì mục đích của nó là hướng dẫn
 * người dùng chọn mật khẩu chứ không phải chấm điểm sau khi họ đã chọn xong.
 */
export function PasswordRuleList({ password }: PasswordRuleListProps) {
  const { t } = useTranslation();

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.isMet(password) })),
    [password]
  );

  return (
    <ul className="mt-2 space-y-1">
      {ruleResults.map((rule) => (
        <li
          key={rule.message.key}
          className={`flex items-center gap-2 text-sm ${
            rule.met ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          {rule.met ? (
            <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
          ) : (
            <X className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          )}
          {t(rule.message.key, rule.message.defaultValue)}
        </li>
      ))}
    </ul>
  );
}
