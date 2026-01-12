import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/Separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { useAssignRoles, useRemoveRoles, useRoles } from '../../hooks/useUserManagement';
import { useToast } from '../../contexts/ToastContext';
import type { User } from '../../types';
import { Mail, Phone, Calendar, Shield, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

/**
 * User Details Dialog Component
 * Displays comprehensive user information and allows role management
 */
export function UserDetailsDialog({ user, open, onOpenChange, onEdit }: UserDetailsDialogProps) {
  const toast = useToast();
  const { data: availableRoles } = useRoles();
  const assignRolesMutation = useAssignRoles();
  const removeRolesMutation = useRemoveRoles();

  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [isEditingRoles, setIsEditingRoles] = useState(false);

  const handleSaveRoles = async () => {
    const rolesToAdd = selectedRoles.filter((r) => !user.roles.includes(r));
    const rolesToRemove = user.roles.filter((r) => !selectedRoles.includes(r));

    try {
      if (rolesToAdd.length > 0) {
        await assignRolesMutation.mutateAsync({ userId: user.id, roles: rolesToAdd });
      }
      if (rolesToRemove.length > 0) {
        await removeRolesMutation.mutateAsync({ userId: user.id, roles: rolesToRemove });
      }

      toast.showSuccess('Success', 'User roles updated successfully');
      setIsEditingRoles(false);
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to update roles'
      );
    }
  };

  const isSavingRoles = assignRolesMutation.isPending || removeRolesMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{user.fullName}</DialogTitle>
              <DialogDescription>
                User ID: {user.id}
              </DialogDescription>
            </div>
            <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-sm">
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{user.email}</div>
                </div>
              </div>
              {user.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{user.phoneNumber}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Member Since</div>
                  <div className="font-medium">
                    {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles & Permissions
                </CardTitle>
                {!isEditingRoles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRoles(user.roles);
                      setIsEditingRoles(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Roles
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingRoles ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {availableRoles?.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={role.id}
                          checked={selectedRoles.includes(role.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRoles([...selectedRoles, role.name]);
                            } else {
                              // Prevent removing the last role
                              if (selectedRoles.length > 1) {
                                setSelectedRoles(selectedRoles.filter((r) => r !== role.name));
                              } else {
                                toast.showError(
                                  'Cannot remove role',
                                  'User must have at least one role'
                                );
                              }
                            }
                          }}
                          disabled={isSavingRoles}
                        />
                        <label
                          htmlFor={role.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {role.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({role.userCount} users)
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveRoles}
                      disabled={isSavingRoles || selectedRoles.length === 0}
                      size="sm"
                    >
                      {isSavingRoles && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRoles(user.roles);
                        setIsEditingRoles(false);
                      }}
                      disabled={isSavingRoles}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
