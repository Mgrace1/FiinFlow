import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () =>void;
  };
}

const EmptyState: React.FC<EmptyStateProps>= ({ icon = '', title, subtitle, action }) =>{
  return (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      {subtitle && <p className="text-gray-600 text-center mb-6 max-w-md">{subtitle}</p>}
      {action && (
      <button onClick={action.onClick} className="btn btn-primary">
          {action.label}
      </button>
      )}
  </div>
  );
};

export default EmptyState;
