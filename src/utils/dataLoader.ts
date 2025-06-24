import type { DataSet, TimePeriod } from '../types';

export const TIME_PERIODS: TimePeriod[] = [
  {
    label: 'Morning Rush (Weekday)',
    value: 'weekday_morning_rush',
    filename: 'weekday_morning_rush.json'
  },
  {
    label: 'Lunch Time (Weekday)',
    value: 'weekday_lunch',
    filename: 'weekday_lunch.json'
  },
  {
    label: 'Evening Rush (Weekday)',
    value: 'weekday_evening_rush',
    filename: 'weekday_evening_rush.json'
  },
  {
    label: 'Late Night (Weekday)',
    value: 'weekday_late_night',
    filename: 'weekday_late_night.json'
  },
  {
    label: 'Weekend Afternoon',
    value: 'weekend_afternoon',
    filename: 'weekend_afternoon.json'
  },
  {
    label: 'Weekend Evening',
    value: 'weekend_evening',
    filename: 'weekend_evening.json'
  }
];

export const loadTripsData = async (filename: string): Promise<DataSet> => {
  try {
    const response = await fetch(`/data/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }
    
    const data: DataSet = await response.json();
    
    // Validate data structure
    if (!data.metadata || !data.trips || !Array.isArray(data.trips)) {
      throw new Error('Invalid data format');
    }
    
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

    return {
      id: `MOCK_${category}_${i.toString().padStart(3, '0')}`,
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
};