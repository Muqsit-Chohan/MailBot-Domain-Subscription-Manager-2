import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-2 sm:p-4" data-lenis-prevent>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] min-h-0 min-w-0 w-full flex-col overflow-hidden ${sizes[size]} card shadow-2xl animate-[slideUp_0.2s_ease-out]`}>
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#e2e6f0] dark:border-[#373e47]">
          <h2 className="font-semibold text-[#0f1523] dark:text-[#eef0f8]">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#2b3037] transition-colors">
            <X size={16} className="text-[#6b7280] dark:text-[#a8b0bc]" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 [overflow-wrap:anywhere]">{children}</div>
      </div>
    </div>,
    document.body
  );
}
