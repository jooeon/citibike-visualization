import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChronologicalRenderer } from '../utils/ChronologicalRenderer';
import { ChronologicalDataLoader } from '../utils/dataLoader';
import type { ProcessedTrip, AnimationState, Station } from '../types';

interface VisualizationCanvasProps {
  animationState: AnimationState;
  stations: Station[];
  onTripCountUpdate?: (count: number) => void;
  onTotalTripsUpdate?: (total: number) => void;
  onStationsLoaded?: (stations: Station[]) => void;
  onTimeUpdate?: (time: string) => void;
  onDateUpdate?: (date: string) => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onFilteredTripsUpdate?: (trips: ProcessedTrip[]) => void;
  onStationTripCountsUpdate?: (counts: Map<number, number>) => void;
  showMap: boolean;
  selectedStationIndices: Set<number>;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  animationState,
  stations,
  onTripCountUpdate,
  onTotalTripsUpdate,
  onStationsLoaded,
  onTimeUpdate,
  onDateUpdate,
  onLoadingStateChange,
  onFilteredTripsUpdate,
  onStationTripCountsUpdate,
  showMap,
  selectedStationIndices
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rendererRef = useRef<ChronologicalRenderer | null>(null);
  const dataLoaderRef = useRef<ChronologicalDataLoader | null>(null);
  
  const stationTripCountsVersionRef = useRef<number>(0);
  
  const animationFrameRef = useRef<number>();
  const updateIntervalRef = useRef<number>();
  const allTripsRef = useRef<ProcessedTrip[]>([]);

  // Initialize map, canvas, and data loader
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Initialize Leaflet map
    const map = L.map(container, {
      center: [40.7128, -74.0060], // NYC center
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    // Set up canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Handle map events
    const updateCanvasPosition = () => {
      canvas.style.transform = 'translate(0px, 0px)';
    };

    map.on('move', updateCanvasPosition);
    map.on('zoom', updateCanvasPosition);
    map.on('zoomend', updateCanvasPosition);
    map.on('moveend', updateCanvasPosition);
    map.on('resize', () => {
      resizeCanvas();
      updateCanvasPosition();
    });

    updateCanvasPosition();

    // Initialize renderer and data loader
    rendererRef.current = new ChronologicalRenderer(canvas, map);
    dataLoaderRef.current = new ChronologicalDataLoader();

    // Load data
    loadChronologicalData();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  const loadChronologicalData = async () => {
    if (!dataLoaderRef.current || !rendererRef.current) return;

    // Set loading state
    if (onLoadingStateChange) {
      onLoadingStateChange(true);
    }

    try {
      console.log('Loading chronological trip data...');
      
      // Load stations first
      const stations = await dataLoaderRef.current.loadStations();
      
      // Load trip data
      const trips = await dataLoaderRef.current.loadAllData();
      allTripsRef.current = trips;
      
      // Initialize renderer with both trips and stations (this will precompute trip counts)
      console.log('Initializing renderer and precomputing station trip counts...');
      rendererRef.current.initializeWithData(trips, stations);
      
      // Now that everything is computed, notify parent components
      if (onStationsLoaded) {
        onStationsLoaded(stations);
      }
      
      // Update total trips count
      if (onTotalTripsUpdate) {
        onTotalTripsUpdate(trips.length);
      }
      
      // Update station trip counts
      if (onStationTripCountsUpdate) {
        const counts = new Map<number, number>();
        for (let i = 0; i < stations.length; i++) {
          counts.set(i, rendererRef.current.getStationTripCount(i));
        }
        onStationTripCountsUpdate(counts);
      }
      
      // Update filtered trips
      if (onFilteredTripsUpdate) {
        const stats = rendererRef.current.getStats();
        onFilteredTripsUpdate(stats.filteredTrips || []);
      }
      
      // Update date display with first trip date
      if (trips.length > 0 && onDateUpdate) {
        const firstTripDate = new Date(trips[0].startTimestamp * 1000);
        const month = String(firstTripDate.getMonth() + 1).padStart(2, '0');
        const day = String(firstTripDate.getDate()).padStart(2, '0');
        const year = firstTripDate.getFullYear();
        const dateStr = `${month}/${day}/${year}`;
        onDateUpdate(dateStr);
      }
      
      console.log(`Loaded ${trips.length} chronological trips`);
      
      // Small delay to ensure all state updates are processed before removing loading UI
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Failed to load chronological data:', error);
    } finally {
      // Clear loading state
      if (onLoadingStateChange) {
        onLoadingStateChange(false);
      }
    }
  };

  // Handle station filter changes
  useEffect(() => {
    if (!rendererRef.current || stations.length === 0) return;

    if (rendererRef.current) {
      rendererRef.current.setSelectedStations(selectedStationIndices);
      
      // Update total trips count when station selection changes
      if (onTotalTripsUpdate) {
        const stats = rendererRef.current.getStats();
        onTotalTripsUpdate(stats.totalAvailableTrips);
      }
    }
  }, [selectedStationIndices]);

  // Separate effect for updating parent state to avoid circular dependencies
  useEffect(() => {
    if (!rendererRef.current) return;

    const stats = rendererRef.current.getStats();
    
  }
  )

  useEffect(() => {
    if (!rendererRef.current || allTripsRef.current.length === 0) return;

    if (animationState.isPlaying) {
      // Start simulation (only if not already started)
      if (rendererRef.current.getStats().totalTripsStarted === 0) {
        rendererRef.current.startSimulation();
      } else {
        rendererRef.current.resume();
      }

      // Update simulation at regular intervals
      updateIntervalRef.current = setInterval(() => {
        if (rendererRef.current) {
          const { currentSimTime, tripsStarted } = rendererRef.current.updateSimulation(animationState.speed);

          // Update date display when day changes
          if (onDateUpdate && allTripsRef.current.length > 0) {
            const month = String(currentSimTime.getMonth() + 1).padStart(2, '0');
            const day = String(currentSimTime.getDate()).padStart(2, '0');
            const year = currentSimTime.getFullYear();
            const dateStr = `${month}/${day}/${year}`;
            onDateUpdate(dateStr);
          }

          // Update time display
          if (onTimeUpdate) {
            const timeStr = currentSimTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            onTimeUpdate(timeStr);
          }

          // Update trip counter
          if (onTripCountUpdate) {
            const stats = rendererRef.current.getStats();
            onTripCountUpdate(stats.totalTripsStarted);
          }
        }
      }, 100); // Update every 100ms

    } else {
      // Pause simulation
      if (rendererRef.current) {
        rendererRef.current.pause();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [animationState.isPlaying, animationState.speed, onTimeUpdate, onTripCountUpdate]);

  // Handle speed changes while preserving timeline position
  // const previousSpeedRef = useRef<number>(animationState.speed);
  // useEffect(() => {
  //   if (rendererRef.current && previousSpeedRef.current !== animationState.speed) {
  //     // Preserve timeline position when speed changes
  //     rendererRef.current.updateSimulationTimeOffset(previousSpeedRef.current);
  //     previousSpeedRef.current = animationState.speed;
  //   }
  // }, [animationState.speed]);

  // Handle reset
  useEffect(() => {
    if (animationState.tripCounter === 0 && !animationState.isPlaying && rendererRef.current) {
      rendererRef.current.reset();
      
      // Reset time display to first trip time
      if (allTripsRef.current.length > 0 && onTimeUpdate) {
        const firstTripTime = allTripsRef.current[0].startTime;
        const timeStr = firstTripTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        onTimeUpdate(timeStr);
      }
    }
  }, [animationState.tripCounter, animationState.isPlaying, onTimeUpdate]);

  // Animation loop for rendering
  useEffect(() => {
    if (!rendererRef.current) return;

    const animate = () => {
      if (rendererRef.current) {
        rendererRef.current.render();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Toggle map visibility
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.opacity = showMap ? '1' : '0';
    }
  }, [showMap]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Map Container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full transition-opacity duration-300"
        style={{ 
          background: '#000000',
          opacity: showMap ? 1 : 0
        }}
      />
      
      {/* Canvas Overlay */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ 
          background: showMap ? 'transparent' : '#000000',
          zIndex: 400
        }}
      />
    </div>
  );
};

export default VisualizationCanvas;