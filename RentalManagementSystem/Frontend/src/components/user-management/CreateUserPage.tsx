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
import { useToast } from '../../contexts/ToastContext';
import { Loader2, ArrowLeft } from 'lucide-react';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().transform(val => val.trim() === '' ? undefined : val).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').or(z.literal('')).transform(val => val === '' ? undefined : val).optional(),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  isActive: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

/**
 * Create User Page Component
 * Full page form for creating a new user with role assignment
 */
export function CreateUserPage() {
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
    console.log('Submitting values:', values);
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
            Back to Users
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
            <p className="text-sm text-gray-500 mt-1">
              Add a new user to the system with role assignments
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
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
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
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1234567890" {...field} />
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
                Security
              </h2>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Leave empty to auto-generate" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 6 characters. A secure password will be auto-generated if left empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Roles Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Role Assignment
              </h2>
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles *</FormLabel>
                    <FormDescription>
                      Select one or more roles for the user. Selected roles will appear as badges below.
                    </FormDescription>
                    <FormControl>
                      <MultiSelect
                        options={roleOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select roles..."
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
                Account Status
              </h2>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">Active Status</FormLabel>
                      <FormDescription>
                        Enable this user account immediately upon creation. Inactive users cannot log in.
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
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
