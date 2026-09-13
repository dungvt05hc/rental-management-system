import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  MultiSelect,
  Switch,
} from '../ui';
import { useCreateUser, useRoles } from '../../hooks/useUserManagement';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════════════
 * Tạo tài khoản người dùng.
 *
 * Hai thẻ, theo đúng hai câu hỏi người tạo tài khoản phải trả lời:
 *
 *   1. NGƯỜI NÀY LÀ AI — tên, email, số điện thoại.
 *   2. HỌ LÀM ĐƯỢC GÌ  — vai trò, mật khẩu, bật/tắt tài khoản.
 *
 * Bản cũ chia thành NĂM mục ("Personal Information", "Contact Information",
 * "Security", "Roles", "Account Status"), mỗi mục một tiêu đề cỡ lớn cho một
 * hoặc hai ô nhập. Tiêu đề nhiều hơn nội dung thì nó không còn phân nhóm được
 * gì nữa, chỉ kéo dài trang.
 *
 * Mật khẩu để trống là CÓ Ý: backend tự sinh một mật khẩu mạnh. Câu giải thích
 * nằm ngay dưới ô chứ không nằm trong placeholder — placeholder biến mất ngay
 * khi người dùng gõ ký tự đầu tiên, đúng lúc họ cần đọc nó nhất.
 * ═══════════════════════════════════════════════════════════════════════════ */

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phoneNumber: z
    .string()
    .transform((value) => (value.trim() === '' ? undefined : value))
    .optional(),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .or(z.literal(''))
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  isActive: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function CreateUserPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const createUserMutation = useCreateUser();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      roles: [],
      isActive: true,
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values);
      // Thông báo đi qua t(): bản cũ viết cứng "Success" / "User created
      // successfully" nên bật tiếng Việt vẫn hiện ra tiếng Anh.
      toast.showSuccess(t('common.success', 'Success'), t('users.createSuccess', 'Account created'));
      navigate('/users');
    } catch (error) {
      toast.showError(
        t('common.error', 'Error'),
        error instanceof Error
          ? error.message
          : t('users.createError', 'Could not create the account')
      );
    }
  };

  const roleOptions = useMemo(
    () => roles?.map((role) => ({ value: role.name, label: role.name })) ?? [],
    [roles]
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="self-start px-2"
        onClick={() => navigate('/users')}
        leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
      >
        {t('users.backToList', 'Back to users')}
      </Button>

      <div>
        <h1 className="text-xl font-semibold text-ink">{t('users.createUser', 'Create User')}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          {t('users.createSubtitle', 'Add a user to the system and choose their roles')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* ── Người này là ai ──────────────────────────────────────────── */}
          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t('users.personalInformation', 'Personal Information')}
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.firstName', 'First name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('users.firstNamePlaceholder', 'e.g. An')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.lastName', 'Last name')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('users.lastNamePlaceholder', 'e.g. Nguyen Van')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email', 'Email Address')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('users.emailPlaceholder', 'name@example.com')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.phoneNumber', 'Phone number')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder={t('users.phonePlaceholder', '09xxxxxxxx')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* ── Họ làm được gì ───────────────────────────────────────────── */}
          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t('users.accessAndSecurity', 'Access and security')}
            </h2>

            <div className="mt-4 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.roleAssignment', 'Roles')} *</FormLabel>
                    <FormDescription>
                      {t(
                        'users.roleHint',
                        'Pick one or more roles. The roles chosen appear as tags below.'
                      )}
                    </FormDescription>
                    <FormControl>
                      <MultiSelect
                        options={roleOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('users.selectRoles', 'Select roles...')}
                        disabled={rolesLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password', 'Password')}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'users.passwordHint',
                        'At least 10 characters. Leave the field empty and a strong password is generated.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-md border border-line p-3">
                    <div>
                      <FormLabel>{t('users.activeStatus', 'Account active')}</FormLabel>
                      <FormDescription>
                        {t('users.activeHint', 'An inactive account cannot sign in.')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 py-3 shadow-sticky sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/users')}
                disabled={createUserMutation.isPending}
                className="max-sm:flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={createUserMutation.isPending}
                loadingText={t('common.saving', 'Saving...')}
                className="max-sm:flex-1"
              >
                {t('users.createUser', 'Create User')}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
