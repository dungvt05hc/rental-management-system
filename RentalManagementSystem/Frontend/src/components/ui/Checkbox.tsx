import * as React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className = '', id }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={`
          h-4 w-4 rounded border border-gray-300 flex items-center justify-center
          transition-colors focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-offset-2 focus-visible:ring-primary
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-primary border-primary' : 'bg-white'}
          ${className}
        `}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </button>
    );
  }
);

Checkbox.displayName = 'Checkbox';
