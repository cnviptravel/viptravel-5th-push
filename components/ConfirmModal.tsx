import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Icon + Title */}
        <div className="p-6 pb-3 flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
            danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <span className={`material-symbols-outlined text-2xl ${
              danger ? 'text-red-500' : 'text-blue-500'
            }`}>
              {danger ? 'delete_forever' : 'help'}
            </span>
          </div>
          <h3 className="font-bold text-lg dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-r border-slate-100 dark:border-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;