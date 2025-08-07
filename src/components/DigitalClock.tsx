import React from 'react';

interface DigitalClockProps {
  currentTime: string;
  currentDate: string;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ currentTime, currentDate }) => {
  return (
    <div className="absolute top-4 left-4 z-[1000] flex gap-4">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3">
        <div className="text-white/80 font-mono text-sm tracking-wide mb-1">
          {currentDate}
        </div>
        <div className="text-white font-mono text-2xl tracking-wider">
          {currentTime}
        </div>
      </div>
      
      {/* Project Title positioned flush next to clock */}
      <div className="hidden sm:block pt-[1vh]">
        <h1 className="text-white/90 font-medium text-sm tracking-wide">
          NYC Citi Bike Data Visualization
        </h1>
      </div>
    </div>
  );
};

export default DigitalClock;