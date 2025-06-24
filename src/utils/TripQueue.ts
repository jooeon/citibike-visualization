import type { ProcessedTrip } from './TripDataManager';

export class TripQueue {
  private trips: ProcessedTrip[];
  private currentIndex: number = 0;
  private shuffled: boolean = false;

  constructor(trips: ProcessedTrip[]) {
    this.trips = [...trips]; // Create a copy
    this.currentIndex = 0;
    this.shuffle();
  }

  private shuffle(): void {
    // Fisher-Yates shuffle for visual variety
    for (let i = this.trips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.trips[i], this.trips[j]] = [this.trips[j], this.trips[i]];
    }
    this.shuffled = true;
  }

  getNextBatch(size: number): ProcessedTrip[] {
    if (this.trips.length === 0) return [];

    const batch: ProcessedTrip[] = [];
    
    for (let i = 0; i < size; i++) {
      batch.push(this.trips[this.currentIndex]);
      this.currentIndex = (this.currentIndex + 1) % this.trips.length;
      
      // Reshuffle when we complete a full cycle
      if (this.currentIndex === 0 && batch.length > 1) {
        this.shuffle();
      }
    }
    
    return batch;
  }

  getNext(): ProcessedTrip | null {
    if (this.trips.length === 0) return null;
    
    const trip = this.trips[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.trips.length;
    
    if (this.currentIndex === 0) {
      this.shuffle();
    }
    
    return trip;
  }

  reset(): void {
    this.currentIndex = 0;
    this.shuffle();
  }

  size(): number {
    return this.trips.length;
  }

  isEmpty(): boolean {
    return this.trips.length === 0;
  }

  updateTrips(newTrips: ProcessedTrip[]): void {
    this.trips = [...newTrips];
    this.currentIndex = 0;
    this.shuffle();
  }

  getProgress(): number {
    if (this.trips.length === 0) return 0;
    return this.currentIndex / this.trips.length;
  }
}