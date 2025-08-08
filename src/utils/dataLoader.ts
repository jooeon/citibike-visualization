import type { DailyDataFile, ProcessedTrip, Station } from '../types';
import { assignBoroughsToStations } from './boroughUtils';

export class ChronologicalDataLoader {
  private loadedFiles: Map<string, DailyDataFile> = new Map();
  private allTrips: ProcessedTrip[] = [];
  private stations: Station[] = [];
  private isLoading: boolean = false;

  async loadStations(): Promise<Station[]> {
    try {
      console.log('Loading stations data...');
      const response = await fetch('/data/stations.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawStations = await response.json();
      
      // Validate station format and extract only the fields we need
      this.stations = rawStations.map((station: any) => ({
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        usage: station.usage,
        // Optional new fields (for debugging/reference)
        key: station.key,
        all_ids: station.all_ids
      }));
      
      // Assign boroughs to stations
      this.stations = assignBoroughsToStations(this.stations);
      
      console.log(`Loaded ${this.stations.length} stations`);
      
      // Log consolidation info if available
      const stationsWithMultipleIds = this.stations.filter(s => s.all_ids && s.all_ids.length > 1);
      if (stationsWithMultipleIds.length > 0) {
        console.log(`Found ${stationsWithMultipleIds.length} consolidated stations (multiple IDs merged)`);
      }
      
      return this.stations;

    } catch (error) {
      console.warn('Failed to load stations data:', error);
      // Return empty array as fallback
      this.stations = [];
      return this.stations;
    }
  }

  async loadAllData(): Promise<ProcessedTrip[]> {
    if (this.isLoading) {
      return this.allTrips;
    }

    this.isLoading = true;
    console.log('Starting to load chronological trip data...');

    try {
      // Load stations data first
      await this.loadStations();

      // Get list of available JSON files
      const fileNames = await this.getAvailableFiles();
      console.log(`Found ${fileNames.length} data files:`, fileNames);

      // Load all files
      const loadPromises = fileNames.map(fileName => this.loadSingleFile(fileName));
      const results = await Promise.allSettled(loadPromises);

      // Process results
      let totalTrips = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          totalTrips += result.value.trips.length;
          console.log(`Loaded ${result.value.trips.length} trips from ${fileNames[index]}`);
        } else {
          console.warn(`Failed to load ${fileNames[index]}:`, result.reason);
        }
      });

      // Convert all raw trip data to processed trips
      this.allTrips = this.processAllTrips();
      
      // Sort chronologically by start timestamp
      this.allTrips.sort((a, b) => a.startTimestamp - b.startTimestamp);

      console.log(`Total processed trips: ${this.allTrips.length}`);
      console.log(`Date range: ${new Date(this.allTrips[0]?.startTimestamp * 1000).toLocaleDateString()} to ${new Date(this.allTrips[this.allTrips.length - 1]?.startTimestamp * 1000).toLocaleDateString()}`);

      return this.allTrips;

    } catch (error) {
      console.error('Error loading chronological data:', error);
      // Return mock data as fallback
      return this.generateMockData();
    } finally {
      this.isLoading = false;
    }
  }

  private async getAvailableFiles(): Promise<string[]> {
    // Try to load files for a date range (you can modify this range as needed)
    const startDate = new Date('2025-02-01');
    const endDate = new Date('2025-02-28');
    const fileNames: string[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
      fileNames.push(`citibike_${dateStr}.json`);
    }

    return fileNames;
  }

  private async loadSingleFile(fileName: string): Promise<DailyDataFile> {
    try {
      const response = await fetch(`/data/${fileName}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DailyDataFile = await response.json();
      
      // Validate data structure
      if (!data.date || !Array.isArray(data.trips)) {
        throw new Error('Invalid data format');
      }

      this.loadedFiles.set(fileName, data);
      return data;

    } catch (error) {
      console.warn(`Failed to load ${fileName}:`, error);
      throw error;
    }
  }

  private processAllTrips(): ProcessedTrip[] {
    const allProcessedTrips: ProcessedTrip[] = [];
    let tripIdCounter = 0;

    this.loadedFiles.forEach((dailyData, fileName) => {
      console.log(`Processing ${fileName} with ${dailyData.trips.length} trips`);
      
      dailyData.trips.forEach((rawTrip) => {
        // Validate trip data
        if (!this.isValidTrip(rawTrip)) {
          return;
        }

        const processedTrip: ProcessedTrip = {
          id: `trip_${tripIdCounter++}`,
          startTime: new Date(rawTrip.st * 1000),
          endTime: new Date(rawTrip.et * 1000),
          startLat: rawTrip.sl,
          startLng: rawTrip.sn,
          endLat: rawTrip.el,
          endLng: rawTrip.en,
          duration: (rawTrip.et - rawTrip.st) * 1000, // Convert to milliseconds
          startTimestamp: rawTrip.st,
          startStationIndex: rawTrip.si,
          endStationIndex: rawTrip.ei
        };
        
        allProcessedTrips.push(processedTrip);
      });
    });

    return allProcessedTrips;
  }

  private isValidTrip(trip: any): boolean {
    // Check if all required fields exist and are valid
    if (typeof trip.st !== 'number' || typeof trip.et !== 'number' ||
        typeof trip.sl !== 'number' || typeof trip.sn !== 'number' ||
        typeof trip.el !== 'number' || typeof trip.en !== 'number') {
      return false;
    }

    // Check if coordinates are within reasonable NYC bounds
    const NYC_BOUNDS = {
      minLat: 40.3500,  // Far southern Staten Island
      maxLat: 41.0000,  // Northern Westchester/Connecticut border
      minLng: -74.5000, // Western New Jersey
      maxLng: -73.3000  // Eastern Long Island/Nassau border
    };

    if (trip.sl < NYC_BOUNDS.minLat || trip.sl > NYC_BOUNDS.maxLat ||
        trip.sn < NYC_BOUNDS.minLng || trip.sn > NYC_BOUNDS.maxLng ||
        trip.el < NYC_BOUNDS.minLat || trip.el > NYC_BOUNDS.maxLat ||
        trip.en < NYC_BOUNDS.minLng || trip.en > NYC_BOUNDS.maxLng) {
      return false;
    }

    // Check if timestamps are reasonable
    if (trip.st >= trip.et || trip.et - trip.st > 7200) { // Max 2 hours
      return false;
    }

    return true;
  }

  private generateMockData(): ProcessedTrip[] {
    console.log('Generating mock chronological data...');
    
    const mockTrips: ProcessedTrip[] = [];
    const startDate = new Date('2025-05-14T00:00:00');
    const endDate = new Date('2025-05-16T23:59:59');
    
    // NYC bounds for realistic coordinates
    const NYC_BOUNDS = {
      minLat: 40.6892,  // Southern Brooklyn
      maxLat: 40.8820,  // Northern Bronx
      minLng: -74.0259, // Western Manhattan/Jersey City
      maxLng: -73.7004  // Eastern Queens
    };

    // Generate trips across the date range
    for (let i = 0; i < 5000; i++) {
      const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
      const startTime = new Date(randomTime);
      const duration = (5 + Math.random() * 25) * 60 * 1000; // 5-30 minutes
      const endTime = new Date(randomTime + duration);

      // Generate random NYC coordinates
      const startLat = NYC_BOUNDS.minLat + Math.random() * (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat);
      const startLng = NYC_BOUNDS.minLng + Math.random() * (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng);
      
      // End point within reasonable distance
      const distance = 0.005 + Math.random() * 0.02;
      const angle = Math.random() * 2 * Math.PI;
      const endLat = Math.max(NYC_BOUNDS.minLat, Math.min(NYC_BOUNDS.maxLat, 
        startLat + Math.cos(angle) * distance));
      const endLng = Math.max(NYC_BOUNDS.minLng, Math.min(NYC_BOUNDS.maxLng, 
        startLng + Math.sin(angle) * distance));

      mockTrips.push({
        id: `mock_trip_${i}`,
        startTime,
        endTime,
        startLat,
        startLng,
        endLat,
        endLng,
        duration,
        startTimestamp: Math.floor(startTime.getTime() / 1000)
      });
    }

    // Sort chronologically
    mockTrips.sort((a, b) => a.startTimestamp - b.startTimestamp);
    
    console.log(`Generated ${mockTrips.length} mock trips`);
    return mockTrips;
  }

  getStations(): Station[] {
    return this.stations;
  }

  getAllTrips(): ProcessedTrip[] {
    return this.allTrips;
  }

  getLoadingState(): boolean {
    return this.isLoading;
  }

  getDateRange(): { start: Date | null, end: Date | null } {
    if (this.allTrips.length === 0) {
      return { start: null, end: null };
    }

    return {
      start: new Date(this.allTrips[0].startTimestamp * 1000),
      end: new Date(this.allTrips[this.allTrips.length - 1].startTimestamp * 1000)
    };
  }
}