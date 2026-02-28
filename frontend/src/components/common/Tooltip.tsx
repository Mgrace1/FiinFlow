import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps>= ({
  content,
  children,
  position = 'top',
  delay = 200,
}) =>{
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () =>{
    timeoutRef.current = window.setTimeout(() =>{
      setIsVisible(true);
      calculatePosition();
    }, delay);
  };

  const hideTooltip = () =>{
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const calculatePosition = () =>{
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = containerRect.width / 2;
        y = -tooltipRect.height - 8;
        break;
      case 'bottom':
        x = containerRect.width / 2;
        y = containerRect.height + 8;
        break;
      case 'left':
        x = -tooltipRect.width - 8;
        y = containerRect.height / 2;
        break;
      case 'right':
        x = containerRect.width + 8;
        y = containerRect.height / 2;
        break;
    }

    setCoords({ x, y });
  };

  useEffect(() =>{
    return () =>{
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!content) return <>{children}</>;

  return (
  <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
      <div
          ref={tooltipRef}
          className="absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-0 animate-fadeIn whitespace-nowrap"
          style={{
            left: position === 'top' || position === 'bottom' ? '50%' : coords.x,
            top: position === 'left' || position === 'right' ? '50%' : coords.y,
            transform:
              position === 'top' || position === 'bottom'
                ? 'translateX(-50%)'
                : 'translateY(-50%)',
            animation: 'fadeIn 0.2s ease-in-out forwards',
          }}
        >
          {content}
        <div
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
            style={{
              left: position === 'top' || position === 'bottom' ? '50%' : position === 'right' ? '-4px' : 'auto',
              right: position === 'left' ? '-4px' : 'auto',
              top: position === 'left' || position === 'right' ? '50%' : position === 'bottom' ? '-4px' : 'auto',
              bottom: position === 'top' ? '-4px' : 'auto',
              marginLeft: position === 'top' || position === 'bottom' ? '-4px' : '0',
              marginTop: position === 'left' || position === 'right' ? '-4px' : '0',
            }}
          />
      </div>
      )}
    <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
  </div>
  );
};

export default Tooltip;
