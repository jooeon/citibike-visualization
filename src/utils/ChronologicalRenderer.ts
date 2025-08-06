import L from 'leaflet';
import type { ProcessedTrip } from '../types';

export interface ActiveTrip {
  trip: ProcessedTrip | null; // Allow null for pooled objects
  startTime: number; // Animation start time
  progress: number;  // 0-1 animation progress
  animationDuration: number; // How long the animation should take

  // Add reset method
  reset(): void;
}

export interface CompletedPath {
  startLatLng: [number, number];
  endLatLng: [number, number];
  color: string;
  opacity: number;
  thickness: number;
  completedAt: number;

  // Add reset method
  reset(): void;
}

// Object Pool Class
class ObjectPool<T> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  acquire(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    // Pool empty, create new object
    return this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.available.push(obj);
  }

  size(): number {
    return this.available.length;
  }
}

// Factory functions for object creation and reset
const createActiveTrip = (): ActiveTrip => ({
  trip: null,
  startTime: 0,
  progress: 0,
  animationDuration: 0,
  reset() {
    this.trip = null;
    this.startTime = 0;
    this.progress = 0;
    this.animationDuration = 0;
  }
});

const resetActiveTrip = (obj: ActiveTrip): void => {
  obj.reset();
};

const createCompletedPath = (): CompletedPath => ({
  startLatLng: [0, 0],
  endLatLng: [0, 0],
  color: '',
  opacity: 0,
  thickness: 0,
  completedAt: 0,
  reset() {
    this.startLatLng = [0, 0];
    this.endLatLng = [0, 0];
    this.color = '';
    this.opacity = 0;
    this.thickness = 0;
    this.completedAt = 0;
  }
});

const resetCompletedPath = (obj: CompletedPath): void => {
  obj.reset();
};

export class ChronologicalRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: L.Map | null;
  private allTrips: ProcessedTrip[] = [];
  private activeTrips: ActiveTrip[] = [];
  private completedPaths: CompletedPath[] = [];
  private currentTripIndex: number = 0;
  private simulationStartTime: number = 0;
  private simulationTimeOffset: number = 0; // Track accumulated simulation time
  private timeScale: number = 500; // 500x speed (1 real second = 500 simulation seconds) - reduced by 50%
  private readonly MAX_DISPLAYED_TRIPS = 100; // Hard cap on displayed trips
  private totalTripsStarted: number = 0; // Monotonically increasing counter
  private simulationTime: number = 0; // Current simulation time in milliseconds since first trip
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private animationTime: number = 0; // Separate time tracking for animations
  private animationStartTime: number = 0; // When animation timing started

  // Object pools
  private activeTripPool: ObjectPool<ActiveTrip>;
  private completedPathPool: ObjectPool<CompletedPath>;

  constructor(canvas: HTMLCanvasElement, map?: L.Map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.map = map || null;

    // Set up canvas for smooth rendering
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Initialize object pools
    this.activeTripPool = new ObjectPool(
        createActiveTrip,
        resetActiveTrip,
        100 // Initial pool size
    );

    this.completedPathPool = new ObjectPool(
        createCompletedPath,
        resetCompletedPath,
        500 // Larger initial size for completed paths
    );
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
    if (this.simulationTime === 0) {
      // True restart
      this.currentTripIndex = 0;
      this.activeTrips = [];
      this.completedPaths = [];
      this.simulationTime = 0;
      this.totalTripsStarted = 0;
      this.animationTime = 0;
      this.animationStartTime = Date.now();
    } else {
      // Resuming - update animation start time to account for pause
      this.animationStartTime = Date.now() - this.animationTime;
    }

    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    console.log('Starting chronological simulation');
  }

  updateSimulation(speed: number): { currentSimTime: Date, tripsStarted: number } {
    if (this.allTrips.length === 0) {
      return { currentSimTime: new Date(), tripsStarted: 0 };
    }

    // Only advance time if running
    if (this.isRunning) {
      const now = Date.now();
      const realTimeElapsed = now - this.lastUpdateTime;
      this.simulationTime += realTimeElapsed * this.timeScale * speed;
      this.lastUpdateTime = now;
    }

    // Calculate current simulation time
    const firstTripTime = this.allTrips[0].startTimestamp * 1000;
    const currentSimTime = new Date(firstTripTime + this.simulationTime);

    // Start new trips that should have started by now (only if running)
    let tripsStarted = 0;
    if (this.isRunning) {
      while (this.currentTripIndex < this.allTrips.length) {
        const trip = this.allTrips[this.currentTripIndex];
        const tripStartTime = trip.startTimestamp * 1000;

        if (tripStartTime <= currentSimTime.getTime()) {
          this.startTrip(trip);
          this.currentTripIndex++;
          this.totalTripsStarted++;
          tripsStarted++;
        } else {
          break;
        }
      }
    }

    // Update active trips (always, even when paused, for visual smoothness)
    this.updateActiveTrips();

    return { currentSimTime, tripsStarted };
  }

  updateSimulationTimeOffset(speed: number): void {
    // Called before speed changes to preserve timeline position
    if (this.simulationStartTime > 0) {
      const realTimeElapsed = Date.now() - this.simulationStartTime;
      this.simulationTimeOffset += realTimeElapsed * this.timeScale * speed;
    }
  }

  private startTrip(trip: ProcessedTrip): void {
    // Calculate animation duration based on actual trip duration
    // Scale it down for visual appeal (e.g., 30-minute trip becomes 3-second animation)
    const animationDuration = Math.max(1000, Math.min(5000, trip.duration / 10));

    // Acquire from pool instead of creating new
    const activeTrip = this.activeTripPool.acquire();
    activeTrip.trip = trip;
    activeTrip.startTime = this.animationTime;
    activeTrip.progress = 0;
    activeTrip.animationDuration = animationDuration;

    this.activeTrips.push(activeTrip);
  }

  private updateActiveTrips(): void {
    // Update animation time based on running state
    if (this.isRunning) {
      this.animationTime = Date.now() - this.animationStartTime;
    }
    // If paused, animationTime stays frozen

    this.activeTrips = this.activeTrips.filter(activeTrip => {
      const elapsed = this.animationTime - activeTrip.startTime;
      activeTrip.progress = Math.min(1, elapsed / activeTrip.animationDuration);

      if (activeTrip.progress >= 1) {
        // Acquire completed path from pool
        const completedPath = this.completedPathPool.acquire();
        completedPath.startLatLng = [activeTrip.trip!.startLat, activeTrip.trip!.startLng];
        completedPath.endLatLng = [activeTrip.trip!.endLat, activeTrip.trip!.endLng];
        completedPath.color = this.getTripColor(activeTrip.trip!);
        completedPath.opacity = 0.6;
        completedPath.thickness = 2;
        completedPath.completedAt = this.animationTime;

        this.completedPaths.push(completedPath);

        // Return activeTrip to pool
        this.activeTripPool.release(activeTrip);

        // Enforce FIFO cap on completed paths
        if (this.completedPaths.length > this.MAX_DISPLAYED_TRIPS) {
          const removedPath = this.completedPaths.shift()!;
          this.completedPathPool.release(removedPath); // Return to pool
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

    // Use animation time for consistent fading behavior
    const currentTime = this.animationTime;

    // Filter and return expired paths to pool
    this.completedPaths = this.completedPaths.filter(path => {
      const age = currentTime - path.completedAt;
      const maxAge = 300000; // 5 minutes

      if (age > maxAge) {
        this.completedPathPool.release(path); // Return to pool
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
      if (activeTrip.trip) {
        this.drawPath(
            activeTrip.trip.startLat, activeTrip.trip.startLng,
            activeTrip.trip.endLat, activeTrip.trip.endLng,
            this.getTripColor(activeTrip.trip), 1.0, 3, activeTrip.progress
        );
      }
    });
  }

  reset(): void {
    // Return all active trips to pool
    this.activeTrips.forEach(activeTrip => {
      this.activeTripPool.release(activeTrip);
    });

    // Return all completed paths to pool
    this.completedPaths.forEach(completedPath => {
      this.completedPathPool.release(completedPath);
    });

    this.currentTripIndex = 0;
    this.activeTrips = [];
    this.completedPaths = [];
    this.simulationTime = 0;
    this.totalTripsStarted = 0;
    this.isRunning = false;
    this.animationTime = 0;
    this.animationStartTime = 0;
    this.lastUpdateTime = 0;
  }

  getStats() {
    return {
      totalTrips: this.allTrips.length,
      currentTripIndex: this.currentTripIndex,
      totalTripsStarted: this.totalTripsStarted,
      activeTrips: this.activeTrips.length,
      completedPaths: this.completedPaths.length,
      displayedTrips: this.activeTrips.length + this.completedPaths.length,
      progress: this.allTrips.length > 0 ? this.currentTripIndex / this.allTrips.length : 0,
      poolStats: {
        activeTripPoolSize: this.activeTripPool.size(),
        completedPathPoolSize: this.completedPathPool.size()
      }
    };
  }

  pause(): void {
    this.isRunning = false;
    // Animation time is frozen by not updating animationStartTime
    console.log('Simulation paused');
  }

  resume(): void {
    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    // Adjust animationStartTime to account for pause duration
    this.animationStartTime = Date.now() - this.animationTime;
    console.log('Simulation resumed');
  }

  isPaused(): boolean {
    return !this.isRunning;
  }
}