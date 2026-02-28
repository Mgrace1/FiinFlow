import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps>= ({ message = 'Loading...' }) =>{
  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-xl">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mb-4"></div>
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  </div>
  );
};

export default LoadingOverlay;
