import L from 'leaflet';
import type { ProcessedTrip } from './TripDataManager';

export interface ExtendedTrip extends ProcessedTrip {
  timeCategory: string;
  timeSlot: number; // Minutes from midnight when trip actually starts
}

export interface PersistentPath {
  startLatLng: [number, number]; // Store original lat/lng
  endLatLng: [number, number];   // Store original lat/lng
  color: string;
  intensity: number;
  thickness: number;
  createdAt: number;
  tripType: 'electric_bike' | 'classic_bike';
  colorShift: number;
  tripIndex: number; // Track order for FIFO removal
}

export interface ActiveTrip {
  trip: ExtendedTrip;
  startTime: number;
  duration: number;
  progress: number;
  colorShift: number; // 0-1 value for color spectrum position
}

export class ContinuousPathRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: L.Map | null;
  private persistentPaths: PersistentPath[] = [];
  private activeTrips: ActiveTrip[];
  private allTrips: ExtendedTrip[] = [];
  private sortedTrips: ExtendedTrip[] = []; // Trips sorted by start time
  private completedTripsCount: number = 0;
  private tripIndexCounter: number = 0;
  private readonly MAX_PERSISTENT_PATHS = 1000; // Maximum number of persistent paths
  private currentTripIndex: number = 0; // Track which trip to show next

  constructor(canvas: HTMLCanvasElement, map?: L.Map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.map = map || null;
    this.activeTrips = [];
    
    // Set up canvas for smooth rendering
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  setAllTrips(trips: ExtendedTrip[]): void {
    this.allTrips = trips;
    
    // Create a sorted copy for temporal playback
    this.sortedTrips = [...trips].sort((a, b) => {
      let aTime = a.startTime;
      let bTime = b.startTime;
      
      // Handle day wrap-around for late night trips
      if (a.timeCategory === 'weekday_late_night' && aTime < 360) aTime += 1440;
      if (b.timeCategory === 'weekday_late_night' && bTime < 360) bTime += 1440;
      
      return aTime - bTime;
    });
    
    this.currentTripIndex = 0;
    
    console.log(`Set ${trips.length} trips, sorted by start time`);
    console.log(`First 5 trip times:`, this.sortedTrips.slice(0, 5).map(t => ({
      time: `${Math.floor(t.startTime / 60)}:${(t.startTime % 60).toFixed(0).padStart(2, '0')}`,
      category: t.timeCategory
    })));
  }

  private distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // Generate color based on time of day (0-1440 minutes)
  private getTimeBasedColor(timeMinutes: number, intensity: number = 1.0): string {
    // Convert time to spectrum position (0-1)
    // 0 minutes (midnight) = 0, 1440 minutes (next midnight) = 1
    const spectrumPosition = (timeMinutes % 1440) / 1440;
    
    let r, g, b;
    
    if (spectrumPosition < 0.167) {
      // Red to Orange (midnight to 4:00 AM)
      const t = spectrumPosition / 0.167;
      r = 255;
      g = Math.floor(165 * t);
      b = 0;
    } else if (spectrumPosition < 0.333) {
      // Orange to Yellow (4:00 AM to 8:00 AM)
      const t = (spectrumPosition - 0.167) / 0.166;
      r = 255;
      g = Math.floor(165 + (255 - 165) * t);
      b = 0;
    } else if (spectrumPosition < 0.5) {
      // Yellow to Green (8:00 AM to 12:00 PM)
      const t = (spectrumPosition - 0.333) / 0.167;
      r = Math.floor(255 * (1 - t));
      g = 255;
      b = 0;
    } else if (spectrumPosition < 0.667) {
      // Green to Cyan (12:00 PM to 4:00 PM)
      const t = (spectrumPosition - 0.5) / 0.167;
      r = 0;
      g = 255;
      b = Math.floor(255 * t);
    } else if (spectrumPosition < 0.833) {
      // Cyan to Blue (4:00 PM to 8:00 PM)
      const t = (spectrumPosition - 0.667) / 0.166;
      r = 0;
      g = Math.floor(255 * (1 - t));
      b = 255;
    } else {
      // Blue to Purple to Red (8:00 PM to midnight)
      const t = (spectrumPosition - 0.833) / 0.167;
      if (t < 0.5) {
        // Blue to Purple
        r = Math.floor(128 * (t * 2));
        g = 0;
        b = 255;
      } else {
        // Purple to Red
        r = Math.floor(128 + 127 * ((t - 0.5) * 2));
        g = 0;
        b = Math.floor(255 * (1 - (t - 0.5) * 2));
      }
    }
    
    // Apply intensity
    r = Math.floor(r * intensity);
    g = Math.floor(g * intensity);
    b = Math.floor(b * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private coordsToCanvas(lat: number, lng: number): { x: number; y: number } {
    // Always use map projection if available for accurate positioning
    if (this.map) {
      const point = this.map.latLngToContainerPoint([lat, lng]);
      return { x: point.x, y: point.y };
    }
    
    // Fallback to simple coordinate transformation with proper NYC bounds
    const NYC_BOUNDS = {
      minLat: 40.4774,   // Southern tip of Staten Island
      maxLat: 40.9176,   // Northern Bronx
      minLng: -74.2591,  // Western Staten Island  
      maxLng: -73.7004   // Eastern Queens
    };
    
    const padding = 50;
    const x = ((lng - NYC_BOUNDS.minLng) / (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng)) 
              * (this.canvas.width - 2 * padding) + padding;
    const y = ((NYC_BOUNDS.maxLat - lat) / (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat)) 
              * (this.canvas.height - 2 * padding) + padding;
    return { x, y };
  }

  private drawPersistentPath(path: PersistentPath, currentTime: number): void {
    const age = currentTime - path.createdAt;
    const maxAge = 300000; // 5 minutes before starting to fade
    const fadeTime = 120000; // 2 minutes to fully fade
    
    let alpha = 1.0;
    
    // Start fading after maxAge
    if (age > maxAge) {
      const fadeProgress = Math.min(1, (age - maxAge) / fadeTime);
      alpha = Math.max(0.1, 1 - fadeProgress); // Never fully disappear, minimum 10% opacity
    }
    
    // Convert lat/lng to current canvas coordinates (this ensures map sync)
    const start = this.coordsToCanvas(path.startLatLng[0], path.startLatLng[1]);
    const end = this.coordsToCanvas(path.endLatLng[0], path.endLatLng[1]);
    
    const distance = this.distance(start, end);
    
    // Skip drawing if points are too close or too far (likely off-screen)
    if (distance < 2 || distance > Math.max(this.canvas.width, this.canvas.height) * 2) {
      return;
    }
    
    const curveOffset = Math.min(25, distance * 0.1);
    
    // Control point for smooth curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const perpX = -(end.y - start.y) / distance;
    const perpY = (end.x - start.x) / distance;
    const controlX = midX + perpX * curveOffset;
    const controlY = midY + perpY * curveOffset;
    
    this.ctx.save();
    
    // Apply alpha for fading effect
    this.ctx.globalAlpha = alpha * path.intensity;
    this.ctx.strokeStyle = path.color;
    this.ctx.lineWidth = path.thickness;
    
    // Add subtle glow for newer paths
    if (age < 30000) { // First 30 seconds
      this.ctx.shadowColor = path.color;
      this.ctx.shadowBlur = 8 * (1 - age / 30000);
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawAllPersistentPaths(): void {
    const currentTime = Date.now();
    
    // Remove very old paths to prevent memory buildup
    const maxPathAge = 600000; // 10 minutes total lifetime
    this.persistentPaths = this.persistentPaths.filter(path => 
      (currentTime - path.createdAt) < maxPathAge
    );
    
    // Enforce maximum number of persistent paths (FIFO - First In, First Out)
    if (this.persistentPaths.length > this.MAX_PERSISTENT_PATHS) {
      // Sort by tripIndex to ensure we remove the oldest trips first
      this.persistentPaths.sort((a, b) => a.tripIndex - b.tripIndex);
      
      // Remove the oldest paths to get back to the limit
      const pathsToRemove = this.persistentPaths.length - this.MAX_PERSISTENT_PATHS;
      this.persistentPaths.splice(0, pathsToRemove);
      
      // console.log(`Removed ${pathsToRemove} oldest paths. Current count: ${this.persistentPaths.length}`);
    }
    
    // Draw all persistent paths
    this.persistentPaths.forEach(path => {
      this.drawPersistentPath(path, currentTime);
    });
  }

  drawActiveTrip(activeTrip: ActiveTrip, currentTimeMinutes: number): void {
    const { trip, progress } = activeTrip;
    
    // Get current canvas coordinates (recalculated each frame for map sync)
    const start = this.coordsToCanvas(trip.start[0], trip.start[1]);
    const end = this.coordsToCanvas(trip.end[0], trip.end[1]);
    
    const distance = this.distance(start, end);
    
    // Skip drawing if points are too close or likely off-screen
    if (distance < 2 || distance > Math.max(this.canvas.width, this.canvas.height) * 2) {
      return;
    }
    
    const curveOffset = Math.min(25, distance * 0.1);
    
    // Control point for smooth curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const perpX = -(end.y - start.y) / distance;
    const perpY = (end.x - start.x) / distance;
    const controlX = midX + perpX * curveOffset;
    const controlY = midY + perpY * curveOffset;
    
    // Calculate current position along curve
    const t = progress;
    const currentX = Math.pow(1-t, 2) * start.x + 2*(1-t)*t * controlX + Math.pow(t, 2) * end.x;
    const currentY = Math.pow(1-t, 2) * start.y + 2*(1-t)*t * controlY + Math.pow(t, 2) * end.y;
    
    this.ctx.save();
    
    // Get time-based color for this trip using its actual start time
    const intensity = 0.9 + (trip.member ? 0.1 : 0);
    const color = this.getTimeBasedColor(trip.startTime, intensity);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = trip.type === 'electric_bike' ? 3.5 : 3;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;
    this.ctx.globalAlpha = 1.0;
    
    // Draw partial curve up to current progress
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    
    if (progress < 1) {
      // Draw curve up to current position
      const segments = 30;
      for (let i = 1; i <= segments * progress; i++) {
        const segmentT = i / segments;
        const x = Math.pow(1-segmentT, 2) * start.x + 2*(1-segmentT)*segmentT * controlX + Math.pow(segmentT, 2) * end.x;
        const y = Math.pow(1-segmentT, 2) * start.y + 2*(1-segmentT)*segmentT * controlY + Math.pow(segmentT, 2) * end.y;
        this.ctx.lineTo(x, y);
      }
    } else {
      this.ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
    }
    
    this.ctx.stroke();
    
    // Draw bright glowing point at current position
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 20;
    this.ctx.globalAlpha = 1.0;
    
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, trip.type === 'electric_bike' ? 5 : 4, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Inner bright white core
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, 2, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  // NEW METHOD: Add trips based on current time progression
  addTripForCurrentTime(currentTimeMinutes: number): void {
    if (this.sortedTrips.length === 0) return;
    
    // Look for trips that should start around the current time
    const timeWindow = 30; // 30 minute window for trip selection
    let tripsToAdd: ExtendedTrip[] = [];
    
    // Find trips within the time window
    for (let i = this.currentTripIndex; i < this.sortedTrips.length; i++) {
      const trip = this.sortedTrips[i];
      let tripTime = trip.startTime;
      
      // Handle day wrap-around for late night trips
      if (trip.timeCategory === 'weekday_late_night' && tripTime < 360) {
        tripTime += 1440;
      }
      
      // Check if this trip should start now
      const timeDiff = Math.abs(tripTime - currentTimeMinutes);
      const dayWrapDiff = Math.abs((tripTime + 1440) - currentTimeMinutes);
      const minDiff = Math.min(timeDiff, dayWrapDiff);
      
      if (minDiff <= timeWindow) {
        tripsToAdd.push(trip);
        this.currentTripIndex = i + 1;
      } else if (tripTime > currentTimeMinutes + timeWindow) {
        // Trips are sorted, so we can break here
        break;
      }
    }
    
    // If we've gone through all trips, reset to beginning for continuous loop
    if (this.currentTripIndex >= this.sortedTrips.length) {
      this.currentTripIndex = 0;
    }
    
    // If no trips found in time window, add a random trip from appropriate time period
    if (tripsToAdd.length === 0) {
      // Find trips from the current time period
      const relevantTrips = this.sortedTrips.filter(trip => {
        let tripTime = trip.startTime;
        if (trip.timeCategory === 'weekday_late_night' && tripTime < 360) {
          tripTime += 1440;
        }
        
        const timeDiff = Math.abs(tripTime - currentTimeMinutes);
        const dayWrapDiff = Math.abs((tripTime + 1440) - currentTimeMinutes);
        return Math.min(timeDiff, dayWrapDiff) <= 120; // 2 hour window
      });
      
      if (relevantTrips.length > 0) {
        const randomTrip = relevantTrips[Math.floor(Math.random() * relevantTrips.length)];
        tripsToAdd.push(randomTrip);
      }
    }
    
    // Add the selected trips
    tripsToAdd.forEach(trip => {
      this.addTrip(trip, currentTimeMinutes);
    });
  }

  addTrip(trip: ExtendedTrip, currentTimeMinutes: number, delay: number = 0): void {
    const duration = trip.duration;
    
    setTimeout(() => {
      this.activeTrips.push({
        trip,
        startTime: Date.now(),
        duration,
        progress: 0,
        colorShift: trip.startTime / 1440 // Use trip's actual start time for color
      });
    }, delay);
  }

  updateActiveTrips(): number {
    const currentTime = Date.now();
    let completedCount = 0;
    
    this.activeTrips = this.activeTrips.filter(activeTrip => {
      const elapsed = currentTime - activeTrip.startTime;
      activeTrip.progress = Math.min(1, elapsed / activeTrip.duration);
      
      if (activeTrip.progress >= 1) {
        // Trip completed, add to persistent paths
        const trip = activeTrip.trip;
        const intensity = 0.7 + (trip.member ? 0.2 : 0);
        const thickness = trip.type === 'electric_bike' ? 2.5 : 2;
        
        // Use the trip's actual start time for color consistency
        const color = this.getTimeBasedColor(trip.startTime, intensity);
        
        // Store original lat/lng coordinates for persistent paths
        this.persistentPaths.push({
          startLatLng: [trip.start[0], trip.start[1]],
          endLatLng: [trip.end[0], trip.end[1]],
          color,
          intensity,
          thickness,
          createdAt: currentTime,
          tripType: trip.type,
          colorShift: activeTrip.colorShift,
          tripIndex: this.tripIndexCounter++ // Assign unique index for FIFO ordering
        });
        
        completedCount++;
        this.completedTripsCount++;
        return false;
      }
      
      return true;
    });
    
    return completedCount;
  }

  render(currentTimeMinutes: number): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw all persistent paths first (background layer)
    this.drawAllPersistentPaths();
    
    // Draw active trips on top (foreground layer)
    this.activeTrips.forEach(activeTrip => {
      this.drawActiveTrip(activeTrip, currentTimeMinutes);
    });
  }

  clearAccumulation(): void {
    this.persistentPaths = [];
    this.activeTrips = [];
    this.completedTripsCount = 0;
    this.tripIndexCounter = 0;
    this.currentTripIndex = 0; // Reset trip progression
  }

  getStats() {
    return {
      activeTrips: this.activeTrips.length,
      persistentPaths: this.persistentPaths.length,
      totalCompletedTrips: this.completedTripsCount,
      maxPersistentPaths: this.MAX_PERSISTENT_PATHS,
      currentTripIndex: this.currentTripIndex,
      totalTrips: this.sortedTrips.length
    };
  }
}