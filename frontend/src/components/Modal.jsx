import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card shadow-2xl animate-[slideUp_0.2s_ease-out]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e6f0] dark:border-[#2a2f48]">
          <h2 className="font-semibold text-[#0f1523] dark:text-[#eef0f8]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] transition-colors">
            <X size={16} className="text-[#6b7280] dark:text-[#8b92b3]" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
