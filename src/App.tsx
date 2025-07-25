import React, { useState, useCallback, useEffect, useRef } from 'react';
import VisualizationCanvas from './components/VisualizationCanvas';
import MinimalControls from './components/MinimalControls';
import LoadingIndicator from './components/LoadingIndicator';
import DigitalClock from './components/DigitalClock';
import { TIME_PERIODS } from './utils/dataLoader';
import { TripDataManager } from './utils/TripDataManager';
import type { DataSet, AnimationState } from './types';

function App() {
  const [allDataSets, setAllDataSets] = useState<Map<string, DataSet>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('07:00');
  const [currentDate, setCurrentDate] = useState<string>('01/01/2024');
  const [showMap, setShowMap] = useState<boolean>(false);
  
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    speed: 1.0,
    currentTime: 0,
    tripCounter: 0
  });

  const dataManagerRef = useRef<TripDataManager>(new TripDataManager());

  // Load all data sets on startup
  useEffect(() => {
    loadAllDataSets();
  }, []);

  const loadAllDataSets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedData = new Map<string, DataSet>();
      
      for (const period of TIME_PERIODS) {
        try {
          const data = await dataManagerRef.current.loadTripData(period.value);
          loadedData.set(period.value, data);
        } catch (err) {
          console.warn(`Failed to load ${period.value}:`, err);
        }
      }
      
      setAllDataSets(loadedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    setAnimationState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  };

  const handleReset = () => {
    setAnimationState(prev => ({
      ...prev,
      tripCounter: 0,
      isPlaying: false,
      currentTime: 0
    }));
    setCurrentTime('07:00');
  };

  const handleSpeedChange = (speed: number) => {
    setAnimationState(prev => ({
      ...prev,
      speed
    }));
  };

  const handleToggleMap = () => {
    setShowMap(prev => !prev);
  };

  const handleTripCountUpdate = useCallback((count: number) => {
    setAnimationState(prev => ({
      ...prev,
      tripCounter: count
    }));
  }, []);

  const handleTimeUpdate = useCallback((time: string) => {
    setCurrentTime(time);
  }, []);

  const handleDateUpdate = useCallback((date: string) => {
    setCurrentDate(date);
  }, []);
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main Visualization Canvas */}
      <VisualizationCanvas
        allDataSets={allDataSets}
        animationState={animationState}
        onTripCountUpdate={handleTripCountUpdate}
        onTimeUpdate={handleTimeUpdate}
        onDateUpdate={handleDateUpdate}
        showMap={showMap}
      />

      {/* Digital Clock */}
      <DigitalClock currentTime={currentTime} currentDate={currentDate} />

      {/* Minimal Controls */}
      <MinimalControls
        animationState={animationState}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        isLoading={isLoading}
        showMap={showMap}
        onToggleMap={handleToggleMap}
      />

      {/* Loading Indicator */}
      <LoadingIndicator isVisible={isLoading} message="Loading 24-hour data..." />

      {/* Error Display */}
      {error && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-300 text-xs mt-1 hover:text-red-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;