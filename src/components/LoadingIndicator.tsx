import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isVisible, 
  message = 'Loading...' 
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/80 z-[2000] flex items-center justify-center">
      <div className="bg-black/60 border border-white/20 rounded-lg px-6 py-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
          <span className="text-white text-sm">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;