import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DigitalClockProps {
  currentTime: string;
  currentDate: string;
  onTimeJump?: (hours: number) => void;
  isPlaying?: boolean;
  canJumpBackward?: boolean;
  canJumpForward?: boolean;
  onDateClick?: () => void;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ 
  currentTime, 
  currentDate, 
  onTimeJump,
  isPlaying = false,
  canJumpBackward = true,
  canJumpForward = true,
  onDateClick
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
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 sm:px-4 sm:py-2 relative">
        <button
          onClick={onDateClick}
          className="text-white/80 hover:text-white font-mono text-xs sm:text-sm tracking-wide mb-1 text-center transition-colors flex items-center justify-center gap-1 w-full"
          title="Select date"
        >
          <Calendar className="w-3 h-3" />
          {currentDate}
        </button>
        
        {/* Current Time - Centered */}
        <div className="text-white font-mono text-sm sm:text-xl tracking-wider text-center mb-4">
          {currentTime}
        </div>
        
        {/* Divider Line */}
        <div className="absolute bottom-8 left-3 right-3 h-px bg-white/10"></div>
        
        {/* Time Jump Controls - Positioned in corners */}
        <div className="relative">
          {/* Jump Backward - Bottom Left */}
          <button
            onClick={() => handleTimeJump(-6)}
            disabled={!canJumpBackward}
            className={`absolute bottom-2 left-2 transition-colors p-1 rounded flex items-center gap-1 ${
              canJumpBackward 
                ? 'text-white/60 hover:text-white cursor-pointer' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            title="Jump back 6 hours"
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="text-xs font-mono">-6 hrs</span>
          </button>

          {/* Jump Forward - Bottom Right */}
          <button
            onClick={() => handleTimeJump(6)}
            disabled={!canJumpForward}
            className={`absolute bottom-2 right-2 transition-colors p-1 rounded flex items-center gap-1 ${
              canJumpForward 
                ? 'text-white/60 hover:text-white cursor-pointer' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            title="Jump forward 6 hours"
          >
            <span className="text-xs font-mono">+6 hrs</span>
            <ChevronRight className="w-3 h-3" />
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