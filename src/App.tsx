import React, { useState, useCallback } from 'react';
import VisualizationCanvas from './components/VisualizationCanvas';
import MinimalControls from './components/MinimalControls';
import LoadingIndicator from './components/LoadingIndicator';
import DigitalClock from './components/DigitalClock';
import StationSelector from './components/StationSelector';
import type { AnimationState, Station } from './types';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('00:00');
  const [currentDate, setCurrentDate] = useState<string>('05/14/2025');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showStationSelector, setShowStationSelector] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationIndices, setSelectedStationIndices] = useState<Set<number>>(new Set());
  const [availableStartStations, setAvailableStartStations] = useState<Station[]>([]);
  
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    speed: 1.0,
    currentTime: 0,
    tripCounter: 0,
    totalTrips: 0
  });

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

  const handleTotalTripsUpdate = useCallback((total: number) => {
    setAnimationState(prev => ({
      ...prev,
      totalTrips: total
    }));
  }, []);

  const handleTimeUpdate = useCallback((time: string) => {
    setCurrentTime(time);
  }, []);

  const handleDateUpdate = useCallback((date: string) => {
    setCurrentDate(date);
  }, []);

  const handleLoadingStateChange = useCallback((loading: boolean) => {
    setIsInitialLoading(loading);
  }, []);

  const handleStationsLoaded = useCallback((loadedStations: Station[]) => {
    setStations(loadedStations);
    // Initially select all stations
    const allIndices = new Set(loadedStations.map((_, index) => index));
    setSelectedStationIndices(allIndices);
  }, []);

  const handleStationToggle = useCallback((stationIndex: number) => {
    setSelectedStationIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationIndex)) {
        newSet.delete(stationIndex);
      } else {
        newSet.add(stationIndex);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllStations = useCallback(() => {
    const allIndices = new Set(availableStartStations.map(station => 
      stations.findIndex(s => s.id === station.id)
    ).filter(index => index >= 0));
    setSelectedStationIndices(allIndices);
  }, [availableStartStations, stations]);

  const handleSelectNoStations = useCallback(() => {
    setSelectedStationIndices(new Set());
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main Visualization Canvas */}
      <VisualizationCanvas
        animationState={animationState}
        onTripCountUpdate={handleTripCountUpdate}
        onTotalTripsUpdate={handleTotalTripsUpdate}
        onTimeUpdate={handleTimeUpdate}
        onDateUpdate={handleDateUpdate}
        onLoadingStateChange={handleLoadingStateChange}
        showMap={showMap}
        selectedStationIndices={selectedStationIndices}
        onStationsLoaded={handleStationsLoaded}
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
        onOpenStationSelector={() => setShowStationSelector(true)}
        selectedStationsCount={selectedStationIndices.size}
        totalStationsCount={availableStartStations.length}
      />

      {/* Loading Indicator */}
      <LoadingIndicator isVisible={isLoading} message="Loading chronological trip data..." />
      
      {/* Initial Data Loading */}
      <LoadingIndicator isVisible={isInitialLoading} message="Loading NYC CitiBike data..." />

      {/* Station Selector */}
      {showStationSelector && (
        <StationSelector
          stations={availableStartStations}
          selectedStationIndices={selectedStationIndices}
          onStationToggle={handleStationToggle}
          onSelectAll={handleSelectAllStations}
          onSelectNone={handleSelectNoStations}
          onClose={() => setShowStationSelector(false)}
          allStations={stations}
        />
      )}

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