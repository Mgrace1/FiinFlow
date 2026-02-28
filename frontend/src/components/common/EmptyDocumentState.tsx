import React from 'react';

interface EmptyDocumentStateProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onAction: () => void;
}

const EmptyDocumentState: React.FC<EmptyDocumentStateProps> = ({
  title,
  subtitle,
  buttonLabel,
  onAction,
}) => {
  return (
    <div className="flex h-[calc(100vh-220px)] flex-col items-center justify-center px-6 py-6 text-center">
      <div className="relative mb-6 h-52 w-52 rounded-full bg-[#f2f1f6]">
        <div className="absolute left-[52px] top-[74px] h-[84px] w-[62px] rounded-xl border-[4px] border-[#a6a6ab] bg-transparent" />
        <div className="absolute left-[95px] top-[74px] h-[84px] w-[62px] rounded-xl border-[4px] border-[#a6a6ab] bg-transparent" />
        <div className="absolute left-[96px] top-[86px] h-[14px] w-[14px] rotate-45 border-r-[4px] border-t-[4px] border-[#a6a6ab]" />
        <div className="absolute left-[140px] top-[86px] h-[14px] w-[14px] rotate-45 border-r-[4px] border-t-[4px] border-[#a6a6ab]" />

        <div className="absolute left-[88px] top-[94px] flex h-[88px] w-[84px] flex-col items-center rounded-2xl border-[4px] border-[#9f9fa4] bg-[#f7f7f9]">
          <div className="mt-5 flex items-center gap-4">
            <span className="text-[30px] leading-none text-[#9f9fa4]">×</span>
            <span className="text-[30px] leading-none text-[#9f9fa4]">×</span>
          </div>
          <div className="mt-1 h-5 w-8 rounded-t-full border-t-[4px] border-[#9f9fa4]" />
        </div>
      </div>

      <h3 className="text-3xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">{subtitle}</p>
      <button onClick={onAction} className="btn btn-primary mt-6">
        {buttonLabel}
      </button>
    </div>
  );
};

export default EmptyDocumentState;
