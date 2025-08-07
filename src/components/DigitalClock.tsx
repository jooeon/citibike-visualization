import React from 'react';

interface DigitalClockProps {
  currentTime: string;
  currentDate: string;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ currentTime, currentDate }) => {
  return (
    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-[1000] flex gap-2 sm:gap-4">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1 sm:px-6 sm:py-3">
        <div className="text-white/80 font-mono text-xs sm:text-sm tracking-wide mb-0.5 sm:mb-1">
          {currentDate}
        </div>
        <div className="text-white font-mono text-sm sm:text-2xl tracking-wider">
          {currentTime}
        </div>
      </div>
      
      {/* Project Title positioned flush next to clock */}
      <div className="hidden sm:block pt-1 sm:pt-[1vh]">
        <h1 className="text-white/90 font-medium text-xs sm:text-sm tracking-wide">
          NYC Citi Bike Data Visualization
        </h1>
      </div>
    </div>
  );
};

export default DigitalClock;