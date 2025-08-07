import React from 'react';
import { getTimeBasedBackgroundColor, formatTimeColor } from '../utils/timeUtils';

interface DayNightOverlayProps {
  currentTime: Date;
  isVisible: boolean;
}

const DayNightOverlay: React.FC<DayNightOverlayProps> = ({ 
  currentTime, 
  isVisible 
}) => {
  if (!isVisible) return null;

  const timeColor = getTimeBasedBackgroundColor(currentTime);
  const overlayColor = formatTimeColor(timeColor);

  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-1000 ease-in-out"
      style={{ 
        backgroundColor: overlayColor,
        mixBlendMode: 'multiply',
        zIndex: 500 // Above map (400) but below canvas (600)
      }}
    />
  );
};

export default DayNightOverlay;