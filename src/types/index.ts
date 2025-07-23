export interface TripData {
  id: string;
  start: [number, number]; // [latitude, longitude]
  end: [number, number];   // [latitude, longitude]
  start_time: string;
  end_time: string;
  hour: number;
  day: number;
  month: number;
  year: number;
  day_of_week: number;
  day_name: string;
  is_weekend: boolean;
  date: string;
  duration_minutes: number;
  type: 'electric_bike' | 'classic_bike';
  member: boolean;
}

export interface DataSet {
  trips: TripData[];
  category: string;
  total_trips: number;
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