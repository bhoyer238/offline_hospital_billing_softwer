import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', isLoading }: ConfirmDialogProps) {
  const btnClass = confirmVariant === 'danger' ? 'btn-danger' : confirmVariant === 'warning' ? 'btn-warning' : 'btn-primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button className={btnClass} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
