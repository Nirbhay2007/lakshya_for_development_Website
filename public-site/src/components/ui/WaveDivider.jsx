import React from 'react';

const WaveDivider = ({ nextBg = 'text-cream', className = '' }) => {
  return (
    <div className={`relative h-20 w-full overflow-hidden -mb-[2px] pointer-events-none select-none z-10 ${className}`}>
      <svg viewBox="0 0 1440 96" preserveAspectRatio="none" className="w-full h-full">
        <path
          d="M0,64 C360,96 1080,32 1440,64 L1440,96 L0,96 Z"
          fill="currentColor"
          className={nextBg}
        />
      </svg>
    </div>
  );
};

export default WaveDivider;
