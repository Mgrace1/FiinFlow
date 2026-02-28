import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () =>void;
  onCancel: () =>void;
  variant?: 'danger' | 'warning' | 'primary';
  confirmClassName?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps>= ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  confirmClassName,
}) =>{
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    primary: 'btn-primary',
  };

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex space-x-3 justify-end">
        <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {cancelText}
        </button>
        <button
            onClick={onConfirm}
            className={`btn ${variantStyles[variant]} ${confirmClassName ?? ''}`}
          >
            {confirmText}
        </button>
      </div>
    </div>
  </div>
  );
};

export default ConfirmModal;
