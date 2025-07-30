import L from 'leaflet';
import type { ProcessedTrip } from '../types';

export interface ActiveTrip {
  trip: ProcessedTrip;
  startTime: number; // Animation start time
  progress: number;  // 0-1 animation progress
  animationDuration: number; // How long the animation should take
}

export interface CompletedPath {
  startLatLng: [number, number];
  endLatLng: [number, number];
  color: string;
  opacity: number;
  thickness: number;
  completedAt: number;
}

export class ChronologicalRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: L.Map | null;
  private allTrips: ProcessedTrip[] = [];
  private activeTrips: ActiveTrip[] = [];
  private completedPaths: CompletedPath[] = [];
  private currentTripIndex: number = 0;
  private simulationStartTime: number = 0;
  private timeScale: number = 500; // 500x speed (1 real second = 500 simulation seconds) - reduced by 50%
  private readonly MAX_DISPLAYED_TRIPS = 500; // Hard cap on displayed trips

  constructor(canvas: HTMLCanvasElement, map?: L.Map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.map = map || null;
    
    // Set up canvas for smooth rendering
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  setTrips(trips: ProcessedTrip[]): void {
    this.allTrips = trips;
    this.currentTripIndex = 0;
    this.simulationStartTime = 0;
    
    console.log(`ChronologicalRenderer: Set ${trips.length} trips`);
    if (trips.length > 0) {
      console.log(`First trip: ${trips[0].startTime.toLocaleString()}`);
      console.log(`Last trip: ${trips[trips.length - 1].startTime.toLocaleString()}`);
    }
  }

  startSimulation(): void {
    this.simulationStartTime = Date.now();
    this.currentTripIndex = 0;
    this.activeTrips = [];
    this.completedPaths = [];
    
    console.log('Starting chronological simulation');
  }

  updateSimulation(speed: number): { currentSimTime: Date, tripsStarted: number } {
    if (this.allTrips.length === 0 || this.simulationStartTime === 0) {
      return { currentSimTime: new Date(), tripsStarted: 0 };
    }

    const realTimeElapsed = Date.now() - this.simulationStartTime;
    const simulationTimeElapsed = realTimeElapsed * this.timeScale * speed;
    
    // Calculate current simulation time
    const firstTripTime = this.allTrips[0].startTimestamp * 1000;
    const currentSimTime = new Date(firstTripTime + simulationTimeElapsed);

    // Start new trips that should have started by now
    let tripsStarted = 0;
    while (this.currentTripIndex < this.allTrips.length) {
      const trip = this.allTrips[this.currentTripIndex];
      const tripStartTime = trip.startTimestamp * 1000;
      
      if (tripStartTime <= currentSimTime.getTime()) {
        this.startTrip(trip);
        this.currentTripIndex++;
        tripsStarted++;
      } else {
        break;
      }
    }

    // Update active trips
    this.updateActiveTrips();

    return { currentSimTime, tripsStarted };
  }

  private startTrip(trip: ProcessedTrip): void {
    // Calculate animation duration based on actual trip duration
    // Scale it down for visual appeal (e.g., 30-minute trip becomes 3-second animation)
    const animationDuration = Math.max(1000, Math.min(5000, trip.duration / 10));

    this.activeTrips.push({
      trip,
      startTime: Date.now(),
      progress: 0,
      animationDuration
    });
  }

  private updateActiveTrips(): void {
    const currentTime = Date.now();
    
    this.activeTrips = this.activeTrips.filter(activeTrip => {
      const elapsed = currentTime - activeTrip.startTime;
      activeTrip.progress = Math.min(1, elapsed / activeTrip.animationDuration);
      
      if (activeTrip.progress >= 1) {
        // Trip animation completed, add to persistent paths
        this.completedPaths.push({
          startLatLng: [activeTrip.trip.startLat, activeTrip.trip.startLng],
          endLatLng: [activeTrip.trip.endLat, activeTrip.trip.endLng],
          color: this.getTripColor(activeTrip.trip),
          opacity: 0.6,
          thickness: 2,
          completedAt: currentTime
        });
        
        // Enforce FIFO cap on completed paths
        if (this.completedPaths.length > this.MAX_DISPLAYED_TRIPS) {
          this.completedPaths.shift(); // Remove oldest completed path
        }
        
        return false; // Remove from active trips
      }
      
      return true; // Keep in active trips
    });
  }

  private getTripColor(trip: ProcessedTrip): string {
    // Gradient color based on time of day
    const hour = trip.startTime.getHours();
    const minute = trip.startTime.getMinutes();
    const timeDecimal = hour + minute / 60; // Convert to decimal hours (e.g., 6.5 for 6:30)
    
    // Define color stops for 24-hour cycle
    const colorStops = [
      { time: 0, color: [139, 92, 246] },   // Night - purple (00:00)
      { time: 6, color: [139, 92, 246] },   // Night - purple (06:00)
      { time: 10, color: [79, 70, 229] },   // Morning rush - blue (10:00)
      { time: 16, color: [245, 158, 11] },  // Midday - amber (16:00)
      { time: 20, color: [220, 38, 38] },   // Evening rush - red (20:00)
      { time: 24, color: [139, 92, 246] }   // Night - purple (24:00)
    ];
    
    // Find the two color stops to interpolate between
    let startStop = colorStops[0];
    let endStop = colorStops[colorStops.length - 1];
    
    for (let i = 0; i < colorStops.length - 1; i++) {
      if (timeDecimal >= colorStops[i].time && timeDecimal <= colorStops[i + 1].time) {
        startStop = colorStops[i];
        endStop = colorStops[i + 1];
        break;
      }
    }
    
    // Calculate interpolation factor
    const timeDiff = endStop.time - startStop.time;
    const factor = timeDiff === 0 ? 0 : (timeDecimal - startStop.time) / timeDiff;
    
    // Interpolate RGB values
    const r = Math.round(startStop.color[0] + (endStop.color[0] - startStop.color[0]) * factor);
    const g = Math.round(startStop.color[1] + (endStop.color[1] - startStop.color[1]) * factor);
    const b = Math.round(startStop.color[2] + (endStop.color[2] - startStop.color[2]) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private coordsToCanvas(lat: number, lng: number): { x: number; y: number } {
    if (this.map) {
      const point = this.map.latLngToContainerPoint([lat, lng]);
      return { x: point.x, y: point.y };
    }
    
    // Fallback coordinate transformation
    const NYC_BOUNDS = {
      minLat: 40.6892,  // Southern Brooklyn
      maxLat: 40.8820,  // Northern Bronx
      minLng: -74.0259, // Western Manhattan/Jersey City
      maxLng: -73.7004  // Eastern Queens
    };
    
    const padding = 50;
    const x = ((lng - NYC_BOUNDS.minLng) / (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng)) 
              * (this.canvas.width - 2 * padding) + padding;
    const y = ((NYC_BOUNDS.maxLat - lat) / (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat)) 
              * (this.canvas.height - 2 * padding) + padding;
    return { x, y };
  }

  private drawPath(startLat: number, startLng: number, endLat: number, endLng: number, 
                   color: string, opacity: number, thickness: number, progress: number = 1): void {
    const start = this.coordsToCanvas(startLat, startLng);
    const end = this.coordsToCanvas(endLat, endLng);
    
    // Skip if coordinates are off-screen or too close
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    if (distance < 2 || distance > Math.max(this.canvas.width, this.canvas.height) * 2) {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    
    // Add subtle glow for active trips
    if (progress < 1) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 8;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    
    if (progress < 1) {
      // Draw partial line for active trips
      const currentX = start.x + (end.x - start.x) * progress;
      const currentY = start.y + (end.y - start.y) * progress;
      this.ctx.lineTo(currentX, currentY);
      
      // Draw glowing dot at current position
      this.ctx.stroke();
      this.ctx.fillStyle = color;
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    } else {
      // Draw complete line for completed trips
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  render(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const currentTime = Date.now();
    
    // Fade old completed paths
    this.completedPaths = this.completedPaths.filter(path => {
      const age = currentTime - path.completedAt;
      const maxAge = 300000; // 5 minutes
      
      if (age > maxAge) {
        return false; // Remove very old paths
      }
      
      // Calculate fading opacity
      let opacity = path.opacity;
      if (age > 60000) { // Start fading after 1 minute
        const fadeProgress = (age - 60000) / (maxAge - 60000);
        opacity = path.opacity * (1 - fadeProgress);
      }
      
      // Draw completed path
      this.drawPath(
        path.startLatLng[0], path.startLatLng[1],
        path.endLatLng[0], path.endLatLng[1],
        path.color, opacity, path.thickness
      );
      
      return true;
    });
    
    // Draw active trips
    this.activeTrips.forEach(activeTrip => {
      this.drawPath(
        activeTrip.trip.startLat, activeTrip.trip.startLng,
        activeTrip.trip.endLat, activeTrip.trip.endLng,
        this.getTripColor(activeTrip.trip), 1.0, 3, activeTrip.progress
      );
    });
  }

  reset(): void {
    this.currentTripIndex = 0;
    this.activeTrips = [];
    this.completedPaths = [];
    this.simulationStartTime = 0;
  }

  getStats() {
    return {
      totalTrips: this.allTrips.length,
      currentTripIndex: this.currentTripIndex,
      activeTrips: this.activeTrips.length,
      completedPaths: this.completedPaths.length,
      displayedTrips: this.activeTrips.length + this.completedPaths.length,
      progress: this.allTrips.length > 0 ? this.currentTripIndex / this.allTrips.length : 0
    };
  }
}