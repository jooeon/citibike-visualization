import type { DataSet, TripData } from '../types';

export interface ProcessedTrip extends TripData {
  canvasStart: { x: number; y: number };
  canvasEnd: { x: number; y: number };
  distance: number;
  duration: number;
  startTime: number; // Minutes from midnight when trip actually started
  visualProperties: {
    color: string;
    intensity: number;
    thickness: number;
    speed: number;
  };
}

export interface CategoryConfig {
  color: string;
  intensity: number;
  averageSpeed: number;
  batchSize: number;
  flowDirection: 'inbound' | 'outbound' | 'scattered' | 'recreational';
  timeRange: { start: number; end: number; peak?: number }; // Minutes from midnight
}

// Expanded NYC bounds to include all 5 boroughs properly
const NYC_BOUNDS = {
  minLat: 40.4774,   // Southern tip of Staten Island
  maxLat: 40.9176,   // Northern Bronx
  minLng: -74.2591,  // Western Staten Island  
  maxLng: -73.7004   // Eastern Queens/Nassau border
};

const TIME_PERIOD_CONFIGS: Record<string, CategoryConfig> = {
  weekday_morning_rush: {
    color: '#4f46e5',
    intensity: 0.9,
    averageSpeed: 1.2,
    batchSize: 75,
    flowDirection: 'inbound',
    timeRange: { start: 420, end: 540, peak: 480 } // 7:00-9:00 AM, peak at 8:00
  },
  weekday_lunch: {
    color: '#f59e0b', 
    intensity: 0.6,
    averageSpeed: 0.8,
    batchSize: 40,
    flowDirection: 'scattered',
    timeRange: { start: 720, end: 840, peak: 780 } // 12:00-2:00 PM, peak at 1:00
  },
  weekday_evening_rush: {
    color: '#dc2626',
    intensity: 0.9,
    averageSpeed: 1.1,
    batchSize: 70,
    flowDirection: 'outbound',
    timeRange: { start: 1020, end: 1140, peak: 1080 } // 5:00-7:00 PM, peak at 6:00
  },
  weekday_late_night: {
    color: '#7c3aed',
    intensity: 0.4,
    averageSpeed: 0.7,
    batchSize: 20,
    flowDirection: 'scattered',
    timeRange: { start: 1380, end: 180, peak: 60 } // 11:00 PM - 3:00 AM, peak at 1:00 AM
  },
  weekend_afternoon: {
    color: '#10b981',
    intensity: 0.5,
    averageSpeed: 0.6,
    batchSize: 30,
    flowDirection: 'recreational',
    timeRange: { start: 840, end: 960, peak: 900 } // 2:00-4:00 PM, peak at 3:00
  },
  weekend_evening: {
    color: '#f97316',
    intensity: 0.7,
    averageSpeed: 0.8,
    batchSize: 35,
    flowDirection: 'recreational',
    timeRange: { start: 1080, end: 1200, peak: 1140 } // 6:00-8:00 PM, peak at 7:00
  }
};

export class TripDataManager {
  private loadedData: Map<string, DataSet> = new Map();
  private processedTrips: Map<string, ProcessedTrip[]> = new Map();
  private cache: Map<string, any> = new Map();
  private isLoading: boolean = false;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {
    this.loadedData = new Map();
    this.processedTrips = new Map();
    this.cache = new Map();
  }

  setCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    // Reprocess all cached data with new dimensions
    this.reprocessAllTrips();
  }

  coordsToCanvas(lat: number, lng: number): { x: number; y: number } {
    const padding = 50;
    const x = ((lng - NYC_BOUNDS.minLng) / (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng)) 
              * (this.canvasWidth - 2 * padding) + padding;
    const y = ((NYC_BOUNDS.maxLat - lat) / (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat)) 
              * (this.canvasHeight - 2 * padding) + padding;
    return { x, y };
  }

  validateTrip(trip: TripData): { isValid: boolean; cleanedTrip?: TripData } {
    // Check if coordinates are within expanded NYC bounds
    const [startLat, startLng] = trip.start;
    const [endLat, endLng] = trip.end;

    // More lenient bounds checking - allow slightly outside for edge cases
    const buffer = 0.01; // ~1km buffer
    if (startLat < (NYC_BOUNDS.minLat - buffer) || startLat > (NYC_BOUNDS.maxLat + buffer) ||
        startLng < (NYC_BOUNDS.minLng - buffer) || startLng > (NYC_BOUNDS.maxLng + buffer) ||
        endLat < (NYC_BOUNDS.minLat - buffer) || endLat > (NYC_BOUNDS.maxLat + buffer) ||
        endLng < (NYC_BOUNDS.minLng - buffer) || endLng > (NYC_BOUNDS.maxLng + buffer)) {
      
      // Log invalid coordinates for debugging
      console.warn('Trip outside NYC bounds:', {
        start: [startLat, startLng],
        end: [endLat, endLng],
        bounds: NYC_BOUNDS
      });
      return { isValid: false };
    }

    // Check if start and end are different (filter maintenance trips)
    const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
    if (distance < 0.05 || distance > 50) { // Less than 50m or more than 50km
      console.warn('Trip distance out of range:', distance, 'km');
      return { isValid: false };
    }

    // Ensure required fields exist
    if (!trip.id || !trip.type || typeof trip.member !== 'boolean') {
      console.warn('Trip missing required fields:', trip);
      return { isValid: false };
    }

    return { isValid: true, cleanedTrip: trip };
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Generate realistic start time for a trip based on its category
  private generateTripStartTime(category: string, tripIndex: number, totalTrips: number): number {
    const config = TIME_PERIOD_CONFIGS[category];
    if (!config) return 480; // Default to 8:00 AM

    const { start, end, peak } = config.timeRange;
    
    // Handle time ranges that cross midnight (like late night)
    let timeRange: number;
    let adjustedStart = start;
    let adjustedEnd = end;
    
    if (end < start) {
      // Time range crosses midnight
      if (Math.random() > 0.5) {
        // First part of the range (before midnight)
        adjustedEnd = 1440; // End at midnight
        timeRange = adjustedEnd - adjustedStart;
      } else {
        // Second part of the range (after midnight)
        adjustedStart = 0; // Start at midnight
        timeRange = adjustedEnd - adjustedStart;
      }
    } else {
      timeRange = adjustedEnd - adjustedStart;
    }

    // Create a distribution that peaks at the specified peak time
    let timeOffset: number;
    
    if (peak !== undefined) {
      // Use normal distribution centered on peak
      const peakPosition = peak >= adjustedStart && peak <= adjustedEnd ? 
        (peak - adjustedStart) / timeRange : 0.5;
      
      // Generate normal distribution using Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Scale and center the normal distribution
      const normalizedTime = Math.max(0, Math.min(1, peakPosition + (z0 * 0.15)));
      timeOffset = normalizedTime * timeRange;
    } else {
      // Uniform distribution across the time range
      timeOffset = Math.random() * timeRange;
    }

    const startTime = adjustedStart + timeOffset;
    
    // Handle wrap-around for times past midnight
    return startTime % 1440;
  }

  processTrip(rawTrip: TripData, category: string, tripIndex: number = 0, totalTrips: number = 1): ProcessedTrip {
    const config = TIME_PERIOD_CONFIGS[category] || TIME_PERIOD_CONFIGS.weekday_morning_rush;
    
    const canvasStart = this.coordsToCanvas(rawTrip.start[0], rawTrip.start[1]);
    const canvasEnd = this.coordsToCanvas(rawTrip.end[0], rawTrip.end[1]);
    
    const distance = this.calculateDistance(
      rawTrip.start[0], rawTrip.start[1],
      rawTrip.end[0], rawTrip.end[1]
    );

    // Generate realistic start time for this trip
    const startTime = this.generateTripStartTime(category, tripIndex, totalTrips);

    // Calculate visual properties based on trip characteristics
    const baseColor = rawTrip.type === 'electric_bike' ? '#00ff88' : '#0088ff';
    const memberBoost = rawTrip.member ? 1.2 : 0.8;
    const intensity = config.intensity * memberBoost;
    
    const duration = Math.max(1500, Math.min(4000, distance * 500)); // 1.5-4 seconds based on distance
    const thickness = rawTrip.type === 'electric_bike' ? 2.5 : 2;

    return {
      ...rawTrip,
      canvasStart,
      canvasEnd,
      distance,
      duration,
      startTime, // Minutes from midnight when this trip actually started
      visualProperties: {
        color: baseColor,
        intensity,
        thickness,
        speed: config.averageSpeed
      }
    };
  }

  async loadTripData(category: string): Promise<DataSet> {
    if (this.loadedData.has(category)) {
      return this.loadedData.get(category)!;
    }

    this.isLoading = true;

    try {
      const filename = this.getCategoryFilename(category);
      const response = await fetch(`/data/${filename}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: DataSet = await response.json();
      
      // Validate data structure
      if (!data.metadata || !data.trips || !Array.isArray(data.trips)) {
        throw new Error('Invalid data format');
      }

      // Validate and clean trips
      const validTrips: TripData[] = [];
      let invalidCount = 0;

      for (const trip of data.trips) {
        const validation = this.validateTrip(trip);
        if (validation.isValid && validation.cleanedTrip) {
          validTrips.push(validation.cleanedTrip);
        } else {
          invalidCount++;
        }
      }

      if (invalidCount > 0) {
        console.warn(`Filtered out ${invalidCount} invalid trips from ${category}`);
      }

      const cleanedData: DataSet = {
        ...data,
        trips: validTrips,
        metadata: {
          ...data.metadata,
          total_trips: validTrips.length
        }
      };

      this.loadedData.set(category, cleanedData);
      this.processTripsForCategory(category, cleanedData);
      
      return cleanedData;

    } catch (error) {
      console.error(`Failed to load ${category}:`, error);
      // Generate fallback data with proper NYC coordinates
      const fallbackData = this.generateFallbackData(category);
      this.loadedData.set(category, fallbackData);
      this.processTripsForCategory(category, fallbackData);
      return fallbackData;
    } finally {
      this.isLoading = false;
    }
  }

  private getCategoryFilename(category: string): string {
    const filenameMap: Record<string, string> = {
      weekday_morning_rush: 'weekday_morning_rush.json',
      weekday_lunch: 'weekday_lunch.json',
      weekday_evening_rush: 'weekday_evening_rush.json',
      weekday_late_night: 'weekday_late_night.json',
      weekend_afternoon: 'weekend_afternoon.json',
      weekend_evening: 'weekend_evening.json'
    };
    
    return filenameMap[category] || 'weekday_morning_rush.json';
  }

  private processTripsForCategory(category: string, data: DataSet): void {
    const totalTrips = data.trips.length;
    const processedTrips = data.trips.map((trip, index) => 
      this.processTrip(trip, category, index, totalTrips)
    );
    
    // Sort trips by their start time for realistic temporal ordering
    processedTrips.sort((a, b) => {
      // Handle day wrap-around for late night trips
      let aTime = a.startTime;
      let bTime = b.startTime;
      
      // If this is a late night category and times are very different,
      // assume one is before midnight and one is after
      if (category === 'weekday_late_night') {
        if (Math.abs(aTime - bTime) > 720) { // More than 12 hours apart
          if (aTime < 360) aTime += 1440; // Add 24 hours to after-midnight times
          if (bTime < 360) bTime += 1440;
        }
      }
      
      return aTime - bTime;
    });
    
    this.processedTrips.set(category, processedTrips);
    
    console.log(`Processed ${processedTrips.length} trips for ${category}, sorted by start time`);
    console.log(`Time range: ${Math.min(...processedTrips.map(t => t.startTime)).toFixed(0)} - ${Math.max(...processedTrips.map(t => t.startTime)).toFixed(0)} minutes`);
  }

  private reprocessAllTrips(): void {
    for (const [category, data] of this.loadedData.entries()) {
      this.processTripsForCategory(category, data);
    }
  }

  getProcessedTrips(category: string): ProcessedTrip[] {
    return this.processedTrips.get(category) || [];
  }

  getCategoryConfig(category: string): CategoryConfig {
    return TIME_PERIOD_CONFIGS[category] || TIME_PERIOD_CONFIGS.weekday_morning_rush;
  }

  private generateFallbackData(category: string): DataSet {
    const config = TIME_PERIOD_CONFIGS[category] || TIME_PERIOD_CONFIGS.weekday_morning_rush;
    const tripCount = Math.floor(Math.random() * 200) + 100;
    
    const mockTrips: TripData[] = Array.from({ length: tripCount }, (_, i) => {
      // Generate realistic NYC coordinates within proper bounds
      // Focus on Manhattan, Brooklyn, and Queens for most trips
      const areas = [
        // Manhattan
        { minLat: 40.7000, maxLat: 40.7831, minLng: -74.0479, maxLng: -73.9441, weight: 0.4 },
        // Brooklyn
        { minLat: 40.5781, maxLat: 40.7394, minLng: -74.0421, maxLng: -73.8331, weight: 0.3 },
        // Queens
        { minLat: 40.5469, maxLat: 40.8007, minLng: -73.9626, maxLng: -73.7004, weight: 0.2 },
        // Bronx
        { minLat: 40.7855, maxLat: 40.9176, minLng: -73.9339, maxLng: -73.7654, weight: 0.1 }
      ];
      
      // Weighted random area selection
      const rand = Math.random();
      let cumWeight = 0;
      let selectedArea = areas[0];
      
      for (const area of areas) {
        cumWeight += area.weight;
        if (rand <= cumWeight) {
          selectedArea = area;
          break;
        }
      }
      
      const startLat = selectedArea.minLat + Math.random() * (selectedArea.maxLat - selectedArea.minLat);
      const startLng = selectedArea.minLng + Math.random() * (selectedArea.maxLng - selectedArea.minLng);
      
      // End point within reasonable distance (0.005-0.03 degrees, roughly 0.5-3km)
      const distance = 0.005 + Math.random() * 0.025;
      const angle = Math.random() * 2 * Math.PI;
      let endLat = startLat + Math.cos(angle) * distance;
      let endLng = startLng + Math.sin(angle) * distance;
      
      // Ensure end point is within NYC bounds
      endLat = Math.max(NYC_BOUNDS.minLat, Math.min(NYC_BOUNDS.maxLat, endLat));
      endLng = Math.max(NYC_BOUNDS.minLng, Math.min(NYC_BOUNDS.maxLng, endLng));

      return {
        id: `FALLBACK_${category}_${i.toString().padStart(3, '0')}`,
        start: [startLat, startLng] as [number, number],
        end: [endLat, endLng] as [number, number],
        type: Math.random() > 0.4 ? 'electric_bike' : 'classic_bike' as 'electric_bike' | 'classic_bike',
        member: Math.random() > 0.25
      };
    });

    return {
      metadata: {
        category,
        total_trips: mockTrips.length,
        time_bucket: category.split('_').slice(-1)[0],
        day_type: category.includes('weekend') ? 'weekend' : 'weekday'
      },
      trips: mockTrips
    };
  }

  getLoadingState(): boolean {
    return this.isLoading;
  }

  clearCache(): void {
    this.cache.clear();
  }

  preloadCategory(category: string): void {
    // Preload in background without blocking
    setTimeout(() => {
      this.loadTripData(category).catch(err => 
        console.warn(`Background preload failed for ${category}:`, err)
      );
    }, 100);
  }

  getStats() {
    return {
      loadedCategories: this.loadedData.size,
      processedCategories: this.processedTrips.size,
      cacheSize: this.cache.size,
      isLoading: this.isLoading
    };
  }
}