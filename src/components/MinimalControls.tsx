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
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg p-3 space-y-3">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPlayPause}
            disabled={isLoading}
            className="flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded px-3 py-2 text-white transition-colors disabled:opacity-50"
          >
            {animationState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onReset}
            className="flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded px-3 py-2 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMap}
            className={`flex items-center justify-center border border-white/20 rounded px-3 py-2 text-white transition-colors ${
              showMap 
                ? 'bg-emerald-600/30 hover:bg-emerald-600/40 border-emerald-500/40' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={showMap ? 'Hide map' : 'Show map'}
          >
            <Map className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleStationSelector}
            className={`flex items-center justify-center border border-white/20 rounded px-3 py-2 text-white transition-colors ${
              selectedStationCount < totalStationCount
                ? 'bg-orange-600/30 hover:bg-orange-600/40 border-orange-500/40' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Filter by starting station"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Station Filter Status */}
        {totalStationCount > 0 && (
          <div className="text-white/60 text-xs text-center">
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
          <div className="text-white/60 text-xs text-center">
            {animationState.tripCounter.toLocaleString()}/{animationState.totalTrips.toLocaleString()} trips
          </div>
        )}
      </div>

      <style jsx>{`
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