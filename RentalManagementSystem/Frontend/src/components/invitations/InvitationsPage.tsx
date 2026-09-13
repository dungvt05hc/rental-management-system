import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, MailPlus, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';
import type { DataTableColumn } from '../ui';
import { useCreateInvitation, useInvitations, useRevokeInvitation } from '../../hooks/useInvitations';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils';
import { InvitationStatus, UserRole } from '../../types';
import type { CreatedInvitation, Invitation } from '../../types';
import { defineMessage, translate } from '../../utils/i18n';
import type { Message } from '../../utils/i18n';

// Xem ghi chú ở RegisterPage: schema phải dựng lúc render để lấy được bản dịch.
const buildCreateInvitationSchema = () =>
  z.object({
    role: z.enum([UserRole.Admin, UserRole.Manager, UserRole.Staff]),
    // Ô trống nghĩa là "ai cầm mã cũng dùng được", nên không thể để zod bắt buộc
    // định dạng email trên chuỗi rỗng.
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: translate('auth.validEmailRequired', 'Please enter a valid email address'),
      }),
    // Số thật, không phải chuỗi: ô nhập đăng ký với valueAsNumber nên zod nhận
    // đúng kiểu mà backend chờ, và z.input trùng z.output để zodResolver suy được
    // kiểu của form.
    expiresInDays: z
      .number({ message: translate('invitations.daysRequired', 'Enter a number of days') })
      .int()
      .min(1, translate('invitations.daysMin', 'At least 1 day'))
      .max(90, translate('invitations.daysMax', 'At most 90 days')),
    note: z.string().trim().max(200),
  });

type CreateInvitationFormValues = z.infer<ReturnType<typeof buildCreateInvitationSchema>>;

/* ═══════════════════════════════════════════════════════════════════════════
 * Lời mời (Admin).
 *
 * Mã đầy đủ chỉ xuất hiện ĐÚNG MỘT LẦN, ngay sau khi tạo: server chỉ lưu bản
 * băm nên không có cách nào hiện lại. Đó là ràng buộc quan trọng nhất của màn
 * hình này, và giao diện phải nói thẳng điều đó chứ không để người dùng tự phát
 * hiện sau khi đã đóng trang.
 *
 * Vì vậy khối mã mới tạo:
 *   - Nằm TRÊN CÙNG, trước cả form đã sinh ra nó.
 *   - Dùng Alert cảnh báo chứ không phải nền xanh "thành công" — đây là việc
 *     CHƯA XONG: người dùng còn phải chép mã đi.
 *   - Nút Chép là hành động chính, đổi sang trạng thái "Đã chép" khi xong.
 *
 * Bảng bên dưới chỉ nhận diện lời mời qua nhóm ký tự đầu, vì không còn gì khác.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Trạng thái lời mời → khoá tra trong statusStyles + nhãn. */
const STATUS_LABELS: Record<InvitationStatus, { message: Message; tone: string }> = {
  [InvitationStatus.Pending]: {
    message: defineMessage('invitations.statusPending', 'Pending'),
    // Đang chờ = việc chưa xong, có người phải dùng mã này. Chip đặc.
    tone: 'pending',
  },
  [InvitationStatus.Redeemed]: {
    message: defineMessage('invitations.statusRedeemed', 'Used'),
    tone: 'accepted',
  },
  [InvitationStatus.Revoked]: {
    message: defineMessage('invitations.statusRevoked', 'Revoked'),
    tone: 'revoked',
  },
  [InvitationStatus.Expired]: {
    message: defineMessage('invitations.statusExpired', 'Expired'),
    tone: 'expired',
  },
};

export function InvitationsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: invitations, isLoading } = useInvitations();
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [lastCreated, setLastCreated] = useState<CreatedInvitation>();
  const [hasCopied, setHasCopied] = useState(false);

  const createInvitationSchema = useMemo(buildCreateInvitationSchema, [t]);

  const form = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { role: UserRole.Staff, email: '', expiresInDays: 7, note: '' },
  });

  const onSubmit = async (values: CreateInvitationFormValues) => {
    try {
      const created = await createInvitation.mutateAsync({
        role: values.role,
        email: values.email === '' ? undefined : values.email,
        expiresInDays: values.expiresInDays,
        note: values.note === '' ? undefined : values.note,
      });

      setLastCreated(created);
      setHasCopied(false);
      form.reset();
    } catch (error) {
      toast.showError(
        t('common.error', 'Error'),
        error instanceof Error
          ? error.message
          : t('invitations.createError', 'Could not create the invitation')
      );
    }
  };

  const handleCopy = async () => {
    if (!lastCreated) return;
    await navigator.clipboard.writeText(lastCreated.code);
    setHasCopied(true);
  };

  const handleRevoke = async (invitation: Invitation) => {
    try {
      await revokeInvitation.mutateAsync(invitation.id);
      toast.showSuccess(t('invitations.revoked', 'Invitation revoked'));
    } catch (error) {
      toast.showError(
        t('common.error', 'Error'),
        error instanceof Error
          ? error.message
          : t('invitations.revokeError', 'Could not revoke the invitation')
      );
    }
  };

  const columns: DataTableColumn<Invitation>[] = useMemo(
    () => [
      {
        key: 'code',
        header: t('invitations.code', 'Code'),
        cell: (invitation) => (
          <div className="min-w-0">
            <span className="numeric block font-medium text-ink">{invitation.codePrefix}…</span>
            {invitation.note && (
              <span className="block truncate text-xs text-ink-muted">{invitation.note}</span>
            )}
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'status',
        header: t('invitations.status', 'Status'),
        cell: (invitation) => {
          const config = STATUS_LABELS[invitation.status];
          return (
            <Badge status={config.tone} size="sm">
              {t(config.message.key, config.message.defaultValue)}
            </Badge>
          );
        },
        mobile: 'status',
        width: 'w-36',
      },
      {
        key: 'role',
        header: t('invitations.role', 'Role'),
        cell: (invitation) => invitation.role,
        width: 'w-28',
      },
      {
        key: 'email',
        header: t('invitations.restrictedTo', 'Restricted to'),
        cell: (invitation) =>
          invitation.email ?? (
            <span className="text-ink-muted">{t('invitations.anyone', 'Anyone with the code')}</span>
          ),
      },
      {
        key: 'expiresAt',
        header: t('invitations.expires', 'Expires'),
        cell: (invitation) => formatDate(invitation.expiresAt),
        numeric: true,
        width: 'w-32',
      },
      {
        key: 'redeemedBy',
        header: t('invitations.usedBy', 'Used by'),
        cell: (invitation) =>
          invitation.redeemedByEmail ?? <span className="text-ink-muted">—</span>,
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-28',
        mobile: 'hidden',
        cell: (invitation) =>
          invitation.status === InvitationStatus.Pending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRevoke(invitation)}
              disabled={revokeInvitation.isPending}
            >
              {t('invitations.revoke', 'Revoke')}
            </Button>
          ) : null,
      },
    ],
    // handleRevoke đóng gói mutation, ổn định giữa các lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, revokeInvitation.isPending]
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('invitations.title', 'Invitations')}
        description={t(
          'invitations.subtitle',
          'Issue a code so someone can register themselves. The code decides the role they get.'
        )}
      />

      {/*
       * Khối mã mới tạo đứng trên cùng và dùng Alert CẢNH BÁO, không phải nền
       * xanh "xong việc": người dùng vẫn còn một việc bắt buộc phải làm ngay —
       * chép mã đi trước khi rời trang.
       */}
      {lastCreated && (
        <Alert
          variant="warning"
          title={t('invitations.copyCodeNow', 'Copy this code now — it is never shown again.')}
        >
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="numeric flex-1 rounded-md border border-line bg-surface px-3 py-2 text-lg tracking-wider text-ink">
              {lastCreated.code}
            </code>

            <Button
              type="button"
              onClick={handleCopy}
              leadingIcon={
                hasCopied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {hasCopied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
            </Button>
          </div>

          <p className="mt-2">
            {t('invitations.grantsRole', 'Grants the role {role}', {
              role: lastCreated.invitation.role,
            })}
            {' · '}
            {t('invitations.expiresOn', 'expires {date}', {
              date: formatDate(lastCreated.invitation.expiresAt),
            })}
            {lastCreated.invitation.email && (
              <>
                {' · '}
                {t('invitations.boundTo', 'only usable by {email}', {
                  email: lastCreated.invitation.email,
                })}
              </>
            )}
          </p>
        </Alert>
      )}

      {/* ── Tạo lời mời ────────────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-ink">
          {t('invitations.createTitle', 'New invitation')}
        </h2>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="invitation-role"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {t('invitations.role', 'Role')}
              </label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) => form.setValue('role', value as UserRole)}
              >
                <SelectTrigger id="invitation-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.Staff}>{UserRole.Staff}</SelectItem>
                  <SelectItem value={UserRole.Manager}>{UserRole.Manager}</SelectItem>
                  <SelectItem value={UserRole.Admin}>{UserRole.Admin}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              label={t('invitations.expiresInDays', 'Valid for (days)')}
              type="number"
              min={1}
              max={90}
              error={form.formState.errors.expiresInDays?.message}
              {...form.register('expiresInDays', { valueAsNumber: true })}
            />

            <Input
              label={t('invitations.emailOptional', 'Restrict to email (optional)')}
              type="email"
              placeholder={t('users.emailPlaceholder', 'name@example.com')}
              hint={t('invitations.emailHint', 'Leave empty to let anyone holding the code use it.')}
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />

            <Input
              label={t('invitations.note', 'Note (optional)')}
              placeholder={t('invitations.notePlaceholder', 'Who is this for?')}
              error={form.formState.errors.note?.message}
              {...form.register('note')}
            />
          </div>

          <Button
            type="submit"
            className="self-start"
            isLoading={createInvitation.isPending}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('invitations.create', 'Create invitation')}
          </Button>
        </form>
      </Card>

      {/* ── Danh sách đã phát ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-2 text-lg font-semibold text-ink">
          {t('invitations.listTitle', 'Issued invitations')}
        </h2>

        {!isLoading && (!invitations || invitations.length === 0) ? (
          <EmptyState
            icon={<MailPlus className="h-8 w-8" />}
            title={t('invitations.empty', 'No invitations have been issued yet.')}
            description={t(
              'invitations.emptyBody',
              'Create a code above and send it to the person who needs an account.'
            )}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={invitations ?? []}
            rowKey={(invitation) => invitation.id}
            caption={t('invitations.listTitle', 'Issued invitations')}
            isLoading={isLoading}
            skeletonRows={5}
            rowStatus={(invitation) => STATUS_LABELS[invitation.status].tone}
            mobileActions={(invitation) =>
              invitation.status === InvitationStatus.Pending ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(invitation)}
                  disabled={revokeInvitation.isPending}
                >
                  {t('invitations.revoke', 'Revoke')}
                </Button>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
