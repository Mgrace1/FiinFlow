import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () =>void;
  onCancel: () =>void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps>= ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}) =>{
  if (!isOpen) return null;

  const variantColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {cancelText}
        </button>
        <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md ${variantColors[variant]}`}
          >
            {confirmText}
        </button>
      </div>
    </div>
  </div>
  );
};
