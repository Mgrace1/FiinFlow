import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () =>void;
  icon?: string;
}

const ErrorState: React.FC<ErrorStateProps>= ({
  title = 'Something went wrong',
  message,
  onRetry,
  icon = '',
}) =>{
  return (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-red-600 mb-2">{title}</h3>
    <p className="text-gray-600 text-center mb-6 max-w-md">{message}</p>
      {onRetry && (
      <button onClick={onRetry} className="btn btn-primary">
          Try Again
      </button>
      )}
  </div>
  );
};

export default ErrorState;
