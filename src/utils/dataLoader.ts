import type { DataSet, TimePeriod } from '../types';

export const TIME_PERIODS: TimePeriod[] = [
  {
    label: 'Morning Rush (Weekday)',
    value: 'weekday_morning_rush',
    filename: 'weekday_morning_rush.json'
  },
  {
    label: 'Early Morning (Weekday)',
    value: 'weekday_early_morning',
    filename: 'weekday_early_morning.json'
  },
  {
    label: 'Lunch Time (Weekday)',
    value: 'weekday_lunch_time',
    filename: 'weekday_lunch_time.json'
  },
  {
    label: 'Afternoon (Weekday)',
    value: 'weekday_afternoon',
    filename: 'weekday_afternoon.json'
  },
  {
    label: 'Evening Rush (Weekday)',
    value: 'weekday_evening_rush',
    filename: 'weekday_evening_rush.json'
  },
  {
    label: 'Night (Weekday)',
    value: 'weekday_night',
    filename: 'weekday_night.json'
  },
  {
    label: 'Late Night (Weekday)',
    value: 'weekday_late_night',
    filename: 'weekday_late_night.json'
  },
  {
    label: 'Morning Rush (Weekend)',
    value: 'weekend_morning_rush',
    filename: 'weekend_morning_rush.json'
  },
  {
    label: 'Early Morning (Weekend)',
    value: 'weekend_early_morning',
    filename: 'weekend_early_morning.json'
  },
  {
    label: 'Lunch Time (Weekend)',
    value: 'weekend_lunch_time',
    filename: 'weekend_lunch_time.json'
  },
  {
    label: 'Weekend Afternoon',
    value: 'weekend_afternoon',
    filename: 'weekend_afternoon.json'
  },
  {
    label: 'Evening Rush (Weekend)',
    value: 'weekend_evening_rush',
    filename: 'weekend_evening_rush.json'
  },
  {
    label: 'Night (Weekend)',
    value: 'weekend_night',
    filename: 'weekend_night.json'
  },
  {
    label: 'Late Night (Weekend)',
    value: 'weekend_late_night',
    filename: 'weekend_late_night.json'
  }
];

export const loadTripsData = async (filename: string): Promise<DataSet> => {
  try {
    const response = await fetch(`/data/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }

    const rawData: TripData[] = await response.json();

    // Validate data structure - expecting array of trip objects
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid data format');
    }

    // Convert to DataSet format
    const data: DataSet = {
      trips: rawData,
      category: filename.replace('.json', ''),
      total_trips: rawData.length
    };

    return data;
  } catch (error) {
    console.error('Error loading trips data:', error);
    throw error;
  }
};

export const generateMockData = (category: string): DataSet => {
  // NYC bounds for realistic coordinates
  const nycBounds = {
    minLat: 40.4774,
    maxLat: 40.9176,
    minLng: -74.2591,
    maxLng: -73.7004
  };

  const tripCount = Math.floor(Math.random() * 300) + 150;

  const mockTrips = Array.from({ length: tripCount }, (_, i) => {
    // Generate realistic NYC coordinates
    const startLat = nycBounds.minLat + Math.random() * (nycBounds.maxLat - nycBounds.minLat);
    const startLng = nycBounds.minLng + Math.random() * (nycBounds.maxLng - nycBounds.minLng);

    // End point within reasonable distance (0.01 to 0.05 degrees)
    const distance = 0.01 + Math.random() * 0.04;
    const angle = Math.random() * 2 * Math.PI;
    const endLat = startLat + Math.cos(angle) * distance;
    const endLng = startLng + Math.sin(angle) * distance;

    // Generate mock time data
    const now = new Date();
    const startTime = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000);
    const duration = 5 + Math.random() * 30; // 5-35 minutes
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    return {
      id: `MOCK_${category}_${i.toString().padStart(3, '0')}`,
      start: [startLat, startLng] as [number, number],
      end: [endLat, endLng] as [number, number],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      hour: startTime.getHours(),
      day: startTime.getDate(),
      month: startTime.getMonth() + 1,
      year: startTime.getFullYear(),
      day_of_week: startTime.getDay(),
      day_name: startTime.toLocaleDateString('en-US', { weekday: 'long' }),
      is_weekend: startTime.getDay() === 0 || startTime.getDay() === 6,
      date: startTime.toISOString().split('T')[0],
      duration_minutes: duration,
      type: Math.random() > 0.4 ? 'electric_bike' : 'classic_bike' as 'electric_bike' | 'classic_bike',
      member: Math.random() > 0.25
    };
  });

  return {
    trips: mockTrips,
    category,
    total_trips: mockTrips.length
  };
};