import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Card } from '../ui/Card';
import { MultiSelect } from '../ui/MultiSelect';
import { useCreateUser, useRoles } from '../../hooks/useUserManagement';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { Loader2, ArrowLeft } from 'lucide-react';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().transform(val => val.trim() === '' ? undefined : val).optional(),
  password: z.string().min(10, 'Password must be at least 10 characters').or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  isActive: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

/**
 * Create User Page Component
 * Full page form for creating a new user with role assignment
 */
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
      email: '', // MUST BE EMPTY
      phoneNumber: '',
      password: '',
      roles: [], // MUST BE EMPTY ARRAY
      isActive: true,
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values);
      toast.showSuccess('Success', 'User created successfully');
      navigate('/users');
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to create user'
      );
    }
  };

  // Convert roles to MultiSelect options
  const roleOptions = React.useMemo(
    () =>
      roles?.map((role) => ({
        value: role.name,
        label: role.name,
      })) || [],
    [roles]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/users')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('users.backToList', 'Back to users')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('users.createUser', 'Create User')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('users.createSubtitle', 'Add a user to the system and choose their roles')}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('users.personalInformation', 'Personal Information')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
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

                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.lastName', 'Last name')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('users.lastNamePlaceholder', 'e.g. Nguyen Van')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('users.contactInformation', 'Contact Information')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email', 'Email Address')} *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('users.emailPlaceholder', 'name@example.com')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.phoneNumber', 'Phone number')}</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder={t('users.phonePlaceholder', '09xxxxxxxx')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Security Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('users.security', 'Security')}
              </h2>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password', 'Password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('users.passwordPlaceholder', 'Leave empty to generate one')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('users.passwordHint', 'At least 10 characters. Leave the field empty and a strong password is generated.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Roles Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('users.roleAssignment', 'Roles')}
              </h2>
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invitations.role', 'Role')} *</FormLabel>
                    <FormDescription>
                      {t('users.roleHint', 'Pick one or more roles. The roles chosen appear as tags below.')}
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
            </div>

            {/* Account Status Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('users.accountStatus', 'Account Status')}
              </h2>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">{t('users.activeStatus', 'Account active')}</FormLabel>
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

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/users')}
                disabled={createUserMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('users.createUser', 'Create User')}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
