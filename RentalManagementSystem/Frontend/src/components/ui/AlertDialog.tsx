import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}

const typeConfig: Record<AlertType, { icon: React.ReactNode; bgColor: string; iconColor: string; buttonColor: string }> = {
  success: {
    icon: <CheckCircle className="h-12 w-12" />,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
  error: {
    icon: <XCircle className="h-12 w-12" />,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: <AlertTriangle className="h-12 w-12" />,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  },
  info: {
    icon: <Info className="h-12 w-12" />,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
};

export function AlertDialog({
  open,
  onOpenChange,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  onConfirm,
}: AlertDialogProps) {
  if (!open) return null;

  const config = typeConfig[type];

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />
      
      {/* Dialog */}
      <div className="relative z-[10000] w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Icon Section */}
          <div className={`${config.bgColor} px-6 py-8 flex justify-center`}>
            <div className={config.iconColor}>
              {config.icon}
            </div>
          </div>

          {/* Content Section */}
          <div className="px-6 py-6 text-center">
            {title && (
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {title}
              </h3>
            )}
            <p className="text-base text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Action Section */}
          <div className="px-6 pb-6 flex justify-center">
            <button
              onClick={handleConfirm}
              className={`${config.buttonColor} text-white px-8 py-2.5 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 min-w-[120px]`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
