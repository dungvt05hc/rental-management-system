import type { User } from '../types';
import { UserRole } from '../types';

export type FeatureKey =
  | 'dashboard'
  | 'rooms'
  | 'tenants'
  | 'invoices'
  | 'items'
  | 'payments'
  | 'reports'
  | 'users'
  | 'system'
  | 'languages';

const ROLE_FEATURES: Record<UserRole, FeatureKey[] | ['*']> = {
  [UserRole.Admin]: ['*'],
  [UserRole.Manager]: ['rooms', 'tenants', 'invoices', 'items', 'payments', 'dashboard', 'reports'],
  [UserRole.Staff]: ['rooms', 'tenants', 'invoices', 'items', 'payments'],
};

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  [UserRole.Admin]: '/',
  [UserRole.Manager]: '/',
  [UserRole.Staff]: '/rooms',
};

export function getUserRoles(user: User | null | undefined): string[] {
  if (!user || !user.roles) return [];
  return Array.isArray(user.roles) ? user.roles : [user.roles as unknown as string];
}

export function canAccessFeature(user: User | null | undefined, feature: FeatureKey): boolean {
  const roles = getUserRoles(user) as UserRole[];
  if (roles.includes(UserRole.Admin)) return true;
  return roles.some((role) => {
    const allowed = ROLE_FEATURES[role];
    return allowed?.includes(feature);
  });
}

export function getDefaultRoute(user: User | null | undefined): string {
  const roles = getUserRoles(user) as UserRole[];
  if (roles.includes(UserRole.Admin)) return DEFAULT_ROUTE_BY_ROLE[UserRole.Admin];
  if (roles.includes(UserRole.Manager)) return DEFAULT_ROUTE_BY_ROLE[UserRole.Manager];
  if (roles.includes(UserRole.Staff)) return DEFAULT_ROUTE_BY_ROLE[UserRole.Staff];
  return '/login';
}
