import React, { useState, useCallback } from 'react';
import VisualizationCanvas from './components/VisualizationCanvas';
import MinimalControls from './components/MinimalControls';
import StationSelector from './components/StationSelector';
import LoadingIndicator from './components/LoadingIndicator';
import DigitalClock from './components/DigitalClock';
import DateSelector from './components/DateSelector';
import InfoButton from './components/InfoButton';
import type { AnimationState, Station, ProcessedTrip } from './types';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('12:00 AM');
  const [currentDate, setCurrentDate] = useState<string>('Wed 05/14/2025');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationIndices, setSelectedStationIndices] = useState<Set<number>>(new Set());
  const [showStationSelector, setShowStationSelector] = useState<boolean>(false);
  const [filteredTrips, setFilteredTrips] = useState<ProcessedTrip[]>([]);
  const [stationTripCounts, setStationTripCounts] = useState<Map<number, number>>(new Map());
  const [showDateSelector, setShowDateSelector] = useState<boolean>(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [allTrips, setAllTrips] = useState<ProcessedTrip[]>([]);
  
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

  const handleStationsLoaded = (loadedStations: Station[]) => {
    setStations(loadedStations);
    // Initially select all stations
    const allIndices = new Set(loadedStations.map((_, index) => index));
    setSelectedStationIndices(allIndices);
  };

  const handleStationToggle = (stationIndex: number) => {
    setSelectedStationIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationIndex)) {
        newSet.delete(stationIndex);
      } else {
        newSet.add(stationIndex);
      }
      return newSet;
    });
  };

  const handleSelectAllStations = () => {
    const allIndices = new Set(stations.map((_, index) => index));
    setSelectedStationIndices(allIndices);
  };

  const handleSelectNoStations = () => {
    setSelectedStationIndices(new Set());
  };

  const handleToggleStationSelector = () => {
    setShowStationSelector(prev => !prev);
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

  const handleFilteredTripsUpdate = useCallback((trips: ProcessedTrip[]) => {
    setFilteredTrips(trips);
  }, []);

  const handleStationTripCountsUpdate = useCallback((counts: Map<number, number>) => {
    setStationTripCounts(counts);
  }, []);

  const handleAllTripsUpdate = useCallback((trips: ProcessedTrip[]) => {
    setAllTrips(trips);
    
    // Extract unique dates from trips
    const dates = new Set<string>();
    trips.forEach(trip => {
      const dateKey = new Date(trip.startTimestamp * 1000).toISOString().split('T')[0];
      dates.add(dateKey);
    });
    setAvailableDates(Array.from(dates).sort());
  }, []);

  const getCurrentSimulationTime = useCallback((): number => {
    if (allTrips.length === 0) return Date.now();
    
    // Get the first trip time as baseline
    const firstTripTime = allTrips[0].startTimestamp * 1000;
    
    // Add current simulation offset (this would need to be tracked from the renderer)
    // For now, we'll estimate based on trip counter and total trips
    const progress = animationState.totalTrips > 0 ? animationState.tripCounter / animationState.totalTrips : 0;
    const lastTripTime = allTrips[allTrips.length - 1].startTimestamp * 1000;
    const estimatedCurrentTime = firstTripTime + (lastTripTime - firstTripTime) * progress;
    
    return estimatedCurrentTime;
  }, [allTrips, animationState.tripCounter, animationState.totalTrips]);

  const canJumpToTime = useCallback((hours: number): boolean => {
    if (allTrips.length === 0) return false;
    
    const currentTime = getCurrentSimulationTime();
    const targetTime = currentTime + (hours * 60 * 60 * 1000);
    
    // Check if target time has any trips within a reasonable window (±1 hour)
    const windowStart = targetTime - (60 * 60 * 1000);
    const windowEnd = targetTime + (60 * 60 * 1000);
    
    return allTrips.some(trip => {
      const tripTime = trip.startTimestamp * 1000;
      return tripTime >= windowStart && tripTime <= windowEnd;
    });
  }, [allTrips, getCurrentSimulationTime]);

  const handleTimeJump = useCallback((hours: number) => {
    // Use the global function exposed by VisualizationCanvas
    if ((window as any).handleTimeJump) {
      (window as any).handleTimeJump(hours);
    }
  }, []);

  const handleDateClick = useCallback(() => {
    setShowDateSelector(true);
  }, []);

  const handleDateSelect = useCallback((dateStr: string) => {
    // dateStr is already in YYYY-MM-DD format from DateSelector
    const targetDate = new Date(dateStr + 'T00:00:00'); // Set to 12:00 AM of selected date
    const targetTimestamp = targetDate.getTime();
    
    // Calculate time difference from current simulation time to target date at 12:00 AM
    const currentSimTime = getCurrentSimulationTime();
    const timeDiff = targetTimestamp - currentSimTime;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Jump to 12:00 AM of the selected date
    handleTimeJump(hoursDiff);
    
    setShowDateSelector(false);
  }, [allTrips, getCurrentSimulationTime, handleTimeJump]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main Visualization Canvas */}
      <VisualizationCanvas
        animationState={animationState}
        stations={stations}
        onTripCountUpdate={handleTripCountUpdate}
        onTotalTripsUpdate={handleTotalTripsUpdate}
        onStationsLoaded={handleStationsLoaded}
        onTimeUpdate={handleTimeUpdate}
        onDateUpdate={handleDateUpdate}
        onLoadingStateChange={handleLoadingStateChange}
        onFilteredTripsUpdate={handleFilteredTripsUpdate}
        onStationTripCountsUpdate={handleStationTripCountsUpdate}
        onAllTripsUpdate={handleAllTripsUpdate}
        showMap={showMap}
        selectedStationIndices={selectedStationIndices}
        onTimeJump={handleTimeJump}
      />

      {/* Digital Clock */}
      <DigitalClock 
        currentTime={currentTime} 
        currentDate={currentDate} 
        onTimeJump={handleTimeJump}
        isPlaying={animationState.isPlaying}
        onDateClick={handleDateClick}
        canJumpBackward={canJumpToTime(-6)}
        canJumpForward={canJumpToTime(6)}
      />

      {/* Minimal Controls */}
      <MinimalControls
        animationState={animationState}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        isLoading={isLoading}
        showMap={showMap}
        onToggleMap={handleToggleMap}
        onToggleStationSelector={handleToggleStationSelector}
        selectedStationCount={selectedStationIndices.size}
        totalStationCount={stations.length}
        hasStartedAnimation={animationState.tripCounter > 0}
      />

      {/* Loading Indicator */}
      <LoadingIndicator isVisible={isLoading} message="Loading chronological trip data..." />
      
      {/* Initial Data Loading */}
      <LoadingIndicator isVisible={isInitialLoading} message="Loading NYC CitiBike data..." />

      {/* Station Selector Modal */}
      {showStationSelector && (
        <StationSelector
          stations={stations}
          selectedStationIndices={selectedStationIndices}
          onStationToggle={handleStationToggle}
          onSelectAll={handleSelectAllStations}
          onSelectNone={handleSelectNoStations}
          onClose={() => setShowStationSelector(false)}
          allStations={stations}
          filteredTrips={filteredTrips}
          stationTripCounts={stationTripCounts}
        />
      )}

      {/* Date Selector Modal */}
      {showDateSelector && (
        <DateSelector
          currentDate={currentDate.split(' ')[1] || currentDate} // Extract date part from "Wed 05/14/2025"
          availableDates={availableDates}
          onDateSelect={handleDateSelect}
          onClose={() => setShowDateSelector(false)}
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

      {/* Info Button */}
      <InfoButton />

      {/* Mobile Title - Bottom Left */}
      <div className="fixed bottom-2 left-2 z-[1000] sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <h1 className="text-white/90 font-medium text-xs tracking-wide">
          NYC Citi Bike Data Visualization
        </h1>
      </div>

      {/* Desktop Copyright - Bottom Right */}
      {/* <div className="hidden sm:block fixed bottom-4 right-4 z-[1000]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="text-white/60 text-xs font-bold">
          &copy;{new Date().getFullYear()} -{' '}
          <a 
            href="https://jooeonpark.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white transition-colors uppercase"
          >
            Joo Eon Park
          </a>
        </div>
      </div> */}
    </div>
  );
}

export default App;