import React from 'react';

interface EmptyDocumentStateProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onAction: () => void;
  variant?: 'default' | 'compact';
  hideAction?: boolean;
}

const EmptyDocumentState: React.FC<EmptyDocumentStateProps> = ({
  title,
  subtitle,
  buttonLabel,
  onAction,
  variant = 'default',
  hideAction = false,
}) => {
  const isCompact = variant === 'compact';

  return (
    <div className={`flex flex-col items-center justify-center px-4 text-center ${
      isCompact ? 'min-h-[320px] py-6 sm:min-h-[360px]' : 'min-h-[calc(100vh-220px)] py-6'
    }`}>
      <div className={`w-full ${isCompact ? 'mb-4 max-w-[170px] sm:max-w-[210px]' : 'mb-6 max-w-[220px] sm:max-w-[260px]'}`}>
        <svg
          viewBox="0 0 220 220"
          className="h-auto w-full"
          role="img"
          aria-label="Empty documents illustration"
        >
          <circle cx="110" cy="110" r="104" fill="#f2f1f6" />
          <rect x="54" y="74" width="62" height="84" rx="12" fill="none" stroke="#a6a6ab" strokeWidth="4" />
          <rect x="96" y="74" width="62" height="84" rx="12" fill="none" stroke="#a6a6ab" strokeWidth="4" />
          <path d="M110 86 l10 0 l0 10" fill="none" stroke="#a6a6ab" strokeWidth="4" />
          <path d="M152 86 l10 0 l0 10" fill="none" stroke="#a6a6ab" strokeWidth="4" />

          <rect x="90" y="94" width="84" height="88" rx="16" fill="#f7f7f9" stroke="#9f9fa4" strokeWidth="4" />
          <text x="112" y="136" textAnchor="middle" fontSize="26" fill="#9f9fa4">x</text>
          <text x="146" y="136" textAnchor="middle" fontSize="26" fill="#9f9fa4">x</text>
          <path d="M124 162 q8 -12 16 0" fill="none" stroke="#9f9fa4" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      <h3 className={`${isCompact ? 'text-2xl sm:text-3xl' : 'text-3xl'} font-bold text-gray-900`}>{title}</h3>
      <p className={`max-w-md text-sm text-gray-500 ${isCompact ? 'mt-1.5' : 'mt-2'}`}>{subtitle}</p>
      {!hideAction && (
        <button onClick={onAction} className={`btn btn-primary ${isCompact ? 'mt-5' : 'mt-6'}`}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyDocumentState;
