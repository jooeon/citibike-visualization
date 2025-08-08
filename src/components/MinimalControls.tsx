import React from 'react';
import { Play, Pause, RotateCcw, Map, Filter } from 'lucide-react';
import type { AnimationState } from '../types';

interface MinimalControlsProps {
  animationState: AnimationState;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  isLoading: boolean;
  showMap: boolean;
  onToggleMap: () => void;
  onToggleStationSelector: () => void;
  selectedStationCount: number;
  totalStationCount: number;
}

const MinimalControls: React.FC<MinimalControlsProps> = ({
  animationState,
  onPlayPause,
  onReset,
  onSpeedChange,
  isLoading,
  showMap,
  onToggleMap,
  onToggleStationSelector,
  selectedStationCount,
  totalStationCount
}) => {
  // Check if this is the initial state (never been played and at beginning)
  const isInitialState = !animationState.isPlaying && animationState.tripCounter === 0;

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[1000]">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
        {/* Control Buttons */}
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={onPlayPause}
            disabled={isLoading}
            className={`flex items-center justify-center border border-white/20 rounded px-2 py-1.5 sm:px-3 sm:py-2 text-white transition-colors disabled:opacity-50 ${
              isInitialState 
                ? 'bg-white/10 animate-pulse hover:bg-white/25' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {animationState.isPlaying ? (
              <Pause className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2 py-1.5 sm:px-3 sm:py-2 text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={onToggleMap}
            className={`flex items-center justify-center border border-white/20 rounded px-3 py-2 text-white transition-colors ${
              showMap 
                ? 'bg-emerald-600/30 hover:bg-emerald-600/40 border-emerald-500/40' 
                : 'bg-white/10 hover:bg-white/20'
            } px-2 py-1.5 sm:px-3 sm:py-2`}
            title={showMap ? 'Hide map' : 'Show map'}
          >
            <Map className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={onToggleStationSelector}
            className={`flex items-center justify-center border border-white/20 rounded px-3 py-2 text-white transition-colors ${
              selectedStationCount < totalStationCount
                ? 'bg-orange-600/30 hover:bg-orange-600/40 border-orange-500/40' 
                : 'bg-white/10 hover:bg-white/20'
            } px-2 py-1.5 sm:px-3 sm:py-2`}
            title="Filter by starting station"
          >
            <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Station Filter Status */}
        {totalStationCount > 0 && (
          <div className="text-white/60 text-xs sm:text-xs text-center">
            {selectedStationCount}/{totalStationCount} stations
          </div>
        )}

        {/* Speed Control */}
        <div>
          <div className="text-white/60 text-xs mb-1">Speed: {animationState.speed}x</div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={animationState.speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Trip Counter */}
        {(animationState.tripCounter > 0 || animationState.totalTrips > 0) && (
          <div className="text-white/60 text-xs sm:text-xs text-center">
            {animationState.tripCounter.toLocaleString()}/{animationState.totalTrips.toLocaleString()} trips
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-pulse {
          animation: pulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse-light {
          0%, 100% {
            background-color: rgba(255, 255, 255, 0.1);
          }
          50% {
            background-color: rgba(255, 255, 255, 0.25);
          }
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
        }
        
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default MinimalControls;