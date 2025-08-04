import type { ReactNode } from 'react';
import { cn, getStatusColor } from '../../utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  status?: string; // For automatic status coloring
  className?: string;
}

export function Badge({ children, variant = 'default', status, className }: BadgeProps) {
  let badgeClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  if (status) {
    // Use status-based coloring
    badgeClasses = cn(badgeClasses, getStatusColor(status));
  } else {
    // Use variant-based coloring
    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground border border-input',
    };
    badgeClasses = cn(badgeClasses, variants[variant]);
  }

  return (
    <div className={cn(badgeClasses, className)}>
      {children}
    </div>
  );
}
