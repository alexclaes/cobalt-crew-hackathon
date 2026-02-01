import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | '2xl';
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${maxWidthStyles[maxWidth]} w-full mx-4 max-h-[90vh] flex flex-col overflow-visible`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b-[3px] border-black">
          <h2 className="text-xl font-bold text-black font-sans">{title}</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 max-h-[calc(90vh-180px)] overflow-y-auto" style={{overflowX: 'visible'}}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t-[3px] border-black flex justify-end gap-3 relative z-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
