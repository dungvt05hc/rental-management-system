import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { useResetUserPassword } from '../../hooks/useUserManagement';
import { useToast } from '../../contexts/ToastContext';
import type { User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert';

const passwordResetSchema = z.object({
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
  confirmPassword: z.string(),
  sendEmailNotification: z.boolean(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

interface PasswordResetDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Password Reset Dialog Component
 * Allows administrators to reset user passwords
 */
export function PasswordResetDialog({ user, open, onOpenChange }: PasswordResetDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const resetPasswordMutation = useResetUserPassword();

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
      sendEmailNotification: false,
    },
  });

  const onSubmit = async (values: PasswordResetFormValues) => {
    try {
      await resetPasswordMutation.mutateAsync({
        userId: user.id,
        resetData: values,
      });
      toast.showSuccess(
        'Success',
        `Password reset successfully for ${user.fullName}`
      );
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to reset password'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.resetPassword', 'Reset password')}</DialogTitle>
          <DialogDescription>
            Reset password for <strong>{user.fullName}</strong> ({user.email})
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('users.resetPasswordHint', 'The user signs in with this new password. Send it to them through a safe channel.')}
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.newPassword', 'New password')} *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.enterNewPassword', 'Enter your new password')} {...field} />
                  </FormControl>
                  <FormDescription>{t('users.passwordMinLength', 'At least 10 characters')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.confirmNewPassword', 'Confirm new password')} *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth.reenterNewPassword', 'Re-enter your new password')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Notification */}
            <FormField
              control={form.control}
              name="sendEmailNotification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('users.emailNotification', 'Notify by email')}</FormLabel>
                    <FormDescription className="text-sm">
                      {t('users.emailNotificationHint', 'Send the new password to the account email.')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={resetPasswordMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('auth.resetPassword', 'Reset password')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
