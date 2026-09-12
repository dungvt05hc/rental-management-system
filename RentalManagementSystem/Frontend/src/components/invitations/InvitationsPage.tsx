import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, Loader2, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui';
import { useCreateInvitation, useInvitations, useRevokeInvitation } from '../../hooks/useInvitations';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils';
import { InvitationStatus, UserRole } from '../../types';
import type { CreatedInvitation, Invitation } from '../../types';
import { defineMessage } from '../../utils/i18n';
import type { Message } from '../../utils/i18n';
import { translate } from '../../utils/i18n';

// Xem ghi chú ở RegisterPage: schema phải dựng lúc render để lấy được bản dịch.
const buildCreateInvitationSchema = () => z.object({
  role: z.enum([UserRole.Admin, UserRole.Manager, UserRole.Staff]),
  // Ô trống nghĩa là "ai cầm mã cũng dùng được", nên không thể để zod bắt buộc
  // định dạng email trên chuỗi rỗng.
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: translate('auth.validEmailRequired', 'Please enter a valid email address')
    }),
  // Số thật, không phải chuỗi: ô nhập đăng ký với valueAsNumber nên zod nhận
  // đúng kiểu mà backend chờ, và z.input trùng z.output để zodResolver suy được
  // kiểu của form.
  expiresInDays: z
    .number({ message: translate('invitations.daysRequired', 'Enter a number of days') })
    .int()
    .min(1, translate('invitations.daysMin', 'At least 1 day'))
    .max(90, translate('invitations.daysMax', 'At most 90 days')),
  note: z.string().trim().max(200)
});

type CreateInvitationFormValues = z.infer<ReturnType<typeof buildCreateInvitationSchema>>;

/**
 * Màn hình quản lý lời mời (Admin).
 *
 * Mã đầy đủ chỉ xuất hiện đúng một lần, ngay sau khi tạo: server chỉ lưu bản băm
 * nên không có cách nào hiện lại. Bảng bên dưới vì thế chỉ nhận diện lời mời qua
 * nhóm ký tự đầu.
 */
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
    defaultValues: {
      role: UserRole.Staff,
      email: '',
      expiresInDays: 7,
      note: ''
    }
  });

  const onSubmit = async (values: CreateInvitationFormValues) => {
    try {
      const created = await createInvitation.mutateAsync({
        role: values.role,
        email: values.email === '' ? undefined : values.email,
        expiresInDays: values.expiresInDays,
        note: values.note === '' ? undefined : values.note
      });

      setLastCreated(created);
      setHasCopied(false);
      form.reset();
    } catch (error) {
      toast.showError(
        t('common.error', 'Error'),
        error instanceof Error ? error.message : 'Failed to create invitation'
      );
    }
  };

  const handleCopy = async () => {
    if (!lastCreated) {
      return;
    }

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
        error instanceof Error ? error.message : 'Failed to revoke invitation'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('invitations.title', 'Invitations')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t(
            'invitations.subtitle',
            'Issue a code so someone can register themselves. The code decides the role they get.'
          )}
        </p>
      </div>

      {lastCreated && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium text-green-900">
              {t(
                'invitations.copyCodeNow',
                'Copy this code now — it is never shown again.'
              )}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 font-mono text-lg tracking-wider text-gray-900">
                {lastCreated.code}
              </code>

              <Button type="button" variant="outline" onClick={handleCopy}>
                {hasCopied ? (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {hasCopied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
              </Button>
            </div>

            <p className="text-sm text-green-800">
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.createTitle', 'New invitation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('invitations.role', 'Role')}
                </label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(value) => form.setValue('role', value as UserRole)}
                >
                  <SelectTrigger className="w-full">
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

              <div>
                <Input
                  label={t('invitations.emailOptional', 'Restrict to email (optional)')}
                  type="email"
                  placeholder={t('users.emailPlaceholder', 'name@example.com')}
                  error={form.formState.errors.email?.message}
                  {...form.register('email')}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t(
                    'invitations.emailHint',
                    'Leave empty to let anyone holding the code use it.'
                  )}
                </p>
              </div>

              <Input
                label={t('invitations.note', 'Note (optional)')}
                placeholder={t('invitations.notePlaceholder', 'Who is this for?')}
                error={form.formState.errors.note?.message}
                {...form.register('note')}
              />
            </div>

            <Button type="submit" isLoading={createInvitation.isPending} disabled={createInvitation.isPending}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('invitations.create', 'Create invitation')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.listTitle', 'Issued invitations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('common.loading', 'Loading...')}
            </p>
          ) : !invitations || invitations.length === 0 ? (
            <p className="py-6 text-sm text-gray-500">
              {t('invitations.empty', 'No invitations have been issued yet.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invitations.code', 'Code')}</TableHead>
                    <TableHead>{t('invitations.role', 'Role')}</TableHead>
                    <TableHead>{t('invitations.status', 'Status')}</TableHead>
                    <TableHead>{t('invitations.restrictedTo', 'Restricted to')}</TableHead>
                    <TableHead>{t('invitations.expires', 'Expires')}</TableHead>
                    <TableHead>{t('invitations.usedBy', 'Used by')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <span className="font-mono">{invitation.codePrefix}…</span>
                        {invitation.note && (
                          <p className="text-xs text-gray-500">{invitation.note}</p>
                        )}
                      </TableCell>
                      <TableCell>{invitation.role}</TableCell>
                      <TableCell>
                        <StatusBadge status={invitation.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {invitation.email ?? t('invitations.anyone', 'Anyone with the code')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(invitation.expiresAt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {invitation.redeemedByEmail ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {invitation.status === InvitationStatus.Pending && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(invitation)}
                            disabled={revokeInvitation.isPending}
                          >
                            {t('invitations.revoke', 'Revoke')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const STATUS_LABELS: Record<InvitationStatus, { message: Message; className: string }> = {
  [InvitationStatus.Pending]: {
    message: defineMessage('invitations.statusPending', 'Pending'),
    className: 'bg-blue-100 text-blue-800'
  },
  [InvitationStatus.Redeemed]: {
    message: defineMessage('invitations.statusRedeemed', 'Used'),
    className: 'bg-green-100 text-green-800'
  },
  [InvitationStatus.Revoked]: {
    message: defineMessage('invitations.statusRevoked', 'Revoked'),
    className: 'bg-red-100 text-red-800'
  },
  [InvitationStatus.Expired]: {
    message: defineMessage('invitations.statusExpired', 'Expired'),
    className: 'bg-gray-100 text-gray-700'
  }
};

function StatusBadge({ status }: { status: InvitationStatus }) {
  const { t } = useTranslation();
  const config = STATUS_LABELS[status];

  return <Badge className={config.className}>{t(config.message.key, config.message.defaultValue)}</Badge>;
}
