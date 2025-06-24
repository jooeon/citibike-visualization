export interface TripData {
  id: string;
  start: [number, number]; // [latitude, longitude]
  end: [number, number];   // [latitude, longitude]
  type: 'electric_bike' | 'classic_bike';
  member: boolean;
}

export interface DataSet {
  metadata: {
    category: string;
    total_trips: number;
    time_bucket: string;
    day_type: string;
  };
  trips: TripData[];
}

export interface TimePeriod {
  label: string;
  value: string;
  filename: string;
}

export interface MapInstance {
  leafletMap: L.Map | null;
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
}

export interface AnimationState {
  isPlaying: boolean;
  speed: number;
  currentTime: number;
  tripCounter: number;
}