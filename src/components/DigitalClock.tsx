import React from 'react';

interface DigitalClockProps {
  currentTime: string;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ currentTime }) => {
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3">
        <div className="text-white font-mono text-2xl tracking-wider">
          {currentTime}
        </div>
      </div>
    </div>
  );
};

export default DigitalClock;