import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export default function Modal({ children, onClose, className = '' }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] relative my-auto ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-xl bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/15 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors"
          title="Cerrar (Esc)"
        >
          <X size={16} />
        </button>
        {children}
      </motion.div>
    </div>
  );
}
