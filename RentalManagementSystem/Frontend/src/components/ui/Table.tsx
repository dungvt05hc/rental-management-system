import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('[&_tr]:border-b', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)}>
      {children}
    </tbody>
  );
}

export function TableFooter({ children, className }: TableProps) {
  return (
    <tfoot className={cn('bg-primary font-medium text-primary-foreground', className)}>
      {children}
    </tfoot>
  );
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }: TableProps) {
  return (
    <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}>
      {children}
    </td>
  );
}

export function TableCaption({ children, className }: TableProps) {
  return (
    <caption className={cn('mt-4 text-sm text-muted-foreground', className)}>
      {children}
    </caption>
  );
}
