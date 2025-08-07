import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DigitalClockProps {
  currentTime: string;
  currentDate: string;
  onTimeJump?: (hours: number) => void;
  isPlaying?: boolean;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ 
  currentTime, 
  currentDate, 
  onTimeJump,
  isPlaying = false 
}) => {
  const handleTimeJump = (hours: number) => {
    if (onTimeJump) {
      // Call the time jump function through window reference
      if ((window as any).handleTimeJump) {
        (window as any).handleTimeJump(hours);
      }
    }
  };

  return (
    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-[1000] flex gap-2 sm:gap-4">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1 sm:px-6 sm:py-3">
        <div className="text-white/80 font-mono text-xs sm:text-sm tracking-wide mb-0.5 sm:mb-1">
          {currentDate}
        </div>
        
        {/* Current Time - Centered */}
        <div className="text-white font-mono text-sm sm:text-2xl tracking-wider text-center mb-2">
          {currentTime}
        </div>
        
        {/* Time Jump Controls - Below time */}
        <div className="flex items-center justify-center gap-3">
          {/* Time Jump Backward */}
          <button
            onClick={() => handleTimeJump(-6)}
            className="text-white/60 hover:text-white transition-colors p-1 rounded flex items-center gap-1"
            title="Jump back 6 hours"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs font-mono">-6 hrs</span>
          </button>
          
          {/* Time Jump Forward */}
          <button
            onClick={() => handleTimeJump(6)}
            className="text-white/60 hover:text-white transition-colors p-1 rounded flex items-center gap-1"
            title="Jump forward 6 hours"
          >
            <span className="text-xs font-mono">+6 hrs</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
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