export interface RawTripData {
  st: number;  // start timestamp (Unix)
  et: number;  // end timestamp (Unix)
  sl: number;  // start latitude
  sn: number;  // start longitude
  el: number;  // end latitude
  en: number;  // end longitude
}

export interface DailyDataFile {
  date: string;
  count: number;
  trips: RawTripData[];
}

export interface ProcessedTrip {
  id: string;
  startTime: Date;
  endTime: Date;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  duration: number; // in milliseconds
  startTimestamp: number; // Unix timestamp for sorting
}

export interface AnimationState {
  isPlaying: boolean;
  speed: number;
  currentTime: number;
  tripCounter: number;
  totalTrips: number;
}

export interface MapInstance {
  leafletMap: L.Map | null;
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
}