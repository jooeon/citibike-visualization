import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ContinuousPathRenderer } from '../utils/continuousPathRenderer';
import { TripDataManager } from '../utils/TripDataManager';
import type { DataSet, AnimationState } from '../types';

interface VisualizationCanvasProps {
  allDataSets: Map<string, DataSet>;
  animationState: AnimationState;
  onTripCountUpdate?: (count: number) => void;
  onTimeUpdate?: (time: string) => void;
  onDateUpdate?: (date: string) => void;
  showMap: boolean;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  allDataSets,
  animationState,
  onTripCountUpdate,
  onTimeUpdate,
  onDateUpdate,
  showMap
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pathRendererRef = useRef<ContinuousPathRenderer | null>(null);
  const dataManagerRef = useRef<TripDataManager | null>(null);
  
  const animationFrameRef = useRef<number>();
  const tripSchedulerRef = useRef<number>();
  const timeProgressRef = useRef<number>(420); // Start at 7:00 AM

  // Initialize map and canvas
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

    // Set up canvas to be positioned absolutely within the container
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';

    // Set up canvas sizing and positioning
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Update data manager with new dimensions
      if (dataManagerRef.current) {
        dataManagerRef.current.setCanvasDimensions(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // CRITICAL FIX: Proper canvas positioning to eliminate parallax effect
    const updateCanvasPosition = () => {
      // The canvas should always stay at 0,0 relative to the container
      // since we're using latLngToContainerPoint which gives us coordinates
      // relative to the container, not the map's internal coordinate system
      canvas.style.transform = 'translate(0px, 0px)';
    };

    // Handle map events - but don't transform the canvas position
    // The coordinate conversion in the renderer handles the positioning
    map.on('move', updateCanvasPosition);
    map.on('zoom', updateCanvasPosition);
    map.on('zoomend', updateCanvasPosition);
    map.on('moveend', updateCanvasPosition);
    map.on('resize', () => {
      resizeCanvas();
      updateCanvasPosition();
    });

    updateCanvasPosition();

    // Initialize components
    pathRendererRef.current = new ContinuousPathRenderer(canvas, map);
    dataManagerRef.current = new TripDataManager();
    dataManagerRef.current.setCanvasDimensions(canvas.width, canvas.height);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (tripSchedulerRef.current) {
        clearInterval(tripSchedulerRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // Toggle map visibility
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.opacity = showMap ? '1' : '0';
    }
  }, [showMap]);

  // Process all datasets when they're loaded
  useEffect(() => {
    if (allDataSets.size > 0 && dataManagerRef.current && pathRendererRef.current) {
      // Extract date from the first available trip for display
      let sampleDate = '01/01/2024'; // Default fallback
      for (const [category, dataSet] of allDataSets) {
        if (dataSet.trips.length > 0 && dataSet.trips[0].date) {
          const tripDate = new Date(dataSet.trips[0].date);
          sampleDate = `${(tripDate.getMonth() + 1).toString().padStart(2, '0')}/${tripDate.getDate().toString().padStart(2, '0')}/${tripDate.getFullYear()}`;
          break;
        }
      }
      
      // Update the date in the parent component
      if (onDateUpdate) {
        onDateUpdate(sampleDate);
      }
      
      // Process all trips from all time periods with proper start times
      const allTrips: any[] = [];
      
      allDataSets.forEach((dataSet, category) => {
        const totalTrips = dataSet.trips.length;
        const processedTrips = dataSet.trips.map((trip, index) => 
          dataManagerRef.current!.processTrip(trip, category, index, totalTrips)
        );
        
        // Add time information to each trip
        const tripsWithTime = processedTrips.map(trip => ({
          ...trip,
          timeCategory: category,
          timeSlot: trip.startTime // Use the calculated start time instead of category-based time
        }));
        
        allTrips.push(...tripsWithTime);
      });

      // Sort ALL trips by their start time across all categories
      allTrips.sort((a, b) => {
        let aTime = a.startTime;
        let bTime = b.startTime;
        
        // Handle day wrap-around for late night trips
        if (a.timeCategory === 'weekday_late_night' && aTime < 360) aTime += 1440;
        if (b.timeCategory === 'weekday_late_night' && bTime < 360) bTime += 1440;
        
        return aTime - bTime;
      });

      pathRendererRef.current.setAllTrips(allTrips);
      
      console.log(`Loaded ${allTrips.length} total trips across all time periods, sorted by start time`);
      console.log(`Time range: ${Math.min(...allTrips.map(t => t.startTime)).toFixed(0)} - ${Math.max(...allTrips.map(t => t.startTime)).toFixed(0)} minutes`);
      
      // Log sample of trip times for verification
      const sampleTrips = allTrips.slice(0, 10).map(t => ({
        category: t.timeCategory,
        startTime: `${Math.floor(t.startTime / 60)}:${(t.startTime % 60).toFixed(0).padStart(2, '0')}`,
        startTimeMinutes: t.startTime
      }));
      console.log('Sample trip start times:', sampleTrips);
    }
  }, [allDataSets]);

  // Trip scheduling and time progression
  useEffect(() => {
    if (!pathRendererRef.current || !animationState.isPlaying || allDataSets.size === 0) {
      if (tripSchedulerRef.current) {
        clearInterval(tripSchedulerRef.current);
      }
      return;
    }

    const baseInterval = 80; // Base interval between trips
    const interval = baseInterval / animationState.speed;

    tripSchedulerRef.current = setInterval(() => {
      if (pathRendererRef.current) {
        // Progress time very slowly - 24 hours over approximately 40 minutes real time
        // This means 1 real minute = 36 virtual minutes
        const timeProgressSpeed = animationState.speed * 0.6; // 0.6 minutes per interval
        timeProgressRef.current += timeProgressSpeed;
        
        // Wrap around after 24 hours (1440 minutes)
        if (timeProgressRef.current >= 1440) {
          timeProgressRef.current = 0;
        }
        
        // Convert progress to time string
        const hours = Math.floor(timeProgressRef.current / 60);
        const minutes = Math.floor(timeProgressRef.current % 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        if (onTimeUpdate) {
          onTimeUpdate(timeString);
        }
        
        // Add trip based on current time - now uses actual start times
        pathRendererRef.current.addTripForCurrentTime(timeProgressRef.current);
      }
    }, interval);

    return () => {
      if (tripSchedulerRef.current) {
        clearInterval(tripSchedulerRef.current);
      }
    };
  }, [animationState.isPlaying, animationState.speed, allDataSets.size, onTimeUpdate]);

  // Reset time when animation resets
  useEffect(() => {
    if (animationState.tripCounter === 0 && !animationState.isPlaying) {
      timeProgressRef.current = 420; // Start at 7:00 AM
      if (onTimeUpdate) {
        onTimeUpdate('07:00');
      }
      if (pathRendererRef.current) {
        pathRendererRef.current.clearAccumulation();
      }
    }
  }, [animationState.tripCounter, animationState.isPlaying, onTimeUpdate]);

  // Animation loop
  useEffect(() => {
    if (!pathRendererRef.current) return;

    const animate = () => {
      if (pathRendererRef.current) {
        const completedTrips = pathRendererRef.current.updateActiveTrips();
        pathRendererRef.current.render(timeProgressRef.current);
        
        // Update trip counter in parent
        if (onTripCountUpdate) {
          const stats = pathRendererRef.current.getStats();
          onTripCountUpdate(stats.totalCompletedTrips + stats.activeTrips);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTripCountUpdate]);

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