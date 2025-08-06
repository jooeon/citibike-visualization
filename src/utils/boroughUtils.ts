import type { Station } from '../types';

// NYC Borough boundaries (approximate)
const BOROUGH_BOUNDS = {
  Manhattan: {
    minLat: 40.7000,
    maxLat: 40.8820,
    minLng: -74.0259,
    maxLng: -73.9070
  },
  Brooklyn: {
    minLat: 40.5700,
    maxLat: 40.7390,
    minLng: -74.0420,
    maxLng: -73.8330
  },
  Queens: {
    minLat: 40.5400,
    maxLat: 40.8000,
    minLng: -73.9620,
    maxLng: -73.7000
  },
  Bronx: {
    minLat: 40.7850,
    maxLat: 40.9200,
    minLng: -73.9330,
    maxLng: -73.7650
  },
  'Staten Island': {
    minLat: 40.4770,
    maxLat: 40.6510,
    minLng: -74.2590,
    maxLng: -74.0520
  }
};

export function getBoroughFromCoordinates(lat: number, lng: number): string {
  // Check each borough's bounds
  for (const [borough, bounds] of Object.entries(BOROUGH_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return borough;
    }
  }
  
  // Fallback: determine by proximity to borough centers
  const boroughCenters = {
    Manhattan: { lat: 40.7831, lng: -73.9712 },
    Brooklyn: { lat: 40.6782, lng: -73.9442 },
    Queens: { lat: 40.7282, lng: -73.7949 },
    Bronx: { lat: 40.8448, lng: -73.8648 },
    'Staten Island': { lat: 40.5795, lng: -74.1502 }
  };

  let closestBorough = 'Manhattan';
  let minDistance = Infinity;

  for (const [borough, center] of Object.entries(boroughCenters)) {
    const distance = Math.sqrt(
      Math.pow(lat - center.lat, 2) + Math.pow(lng - center.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestBorough = borough;
    }
  }

  return closestBorough;
}

export function assignBoroughsToStations(stations: Station[]): Station[] {
  return stations.map(station => ({
    ...station,
    borough: getBoroughFromCoordinates(station.lat, station.lng)
  }));
}

export function groupStationsByBorough(stations: Station[]): Map<string, Station[]> {
  const boroughOrder = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
  const grouped = new Map<string, Station[]>();

  // Initialize with empty arrays in the correct order
  boroughOrder.forEach(borough => {
    grouped.set(borough, []);
  });

  // Group stations by borough
  stations.forEach(station => {
    const borough = station.borough || 'Manhattan';
    const existing = grouped.get(borough) || [];
    existing.push(station);
    grouped.set(borough, existing);
  });

  // Sort stations within each borough alphabetically
  grouped.forEach((stationList, borough) => {
    stationList.sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

export function getBoroughStats(stations: Station[], stationTripCounts: Map<number, number>, allStations: Station[]): Map<string, { count: number, trips: number }> {
  const stats = new Map<string, { count: number, trips: number }>();
  const boroughOrder = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

  // Initialize stats
  boroughOrder.forEach(borough => {
    stats.set(borough, { count: 0, trips: 0 });
  });

  stations.forEach(station => {
    const borough = station.borough || 'Manhattan';
    const currentStats = stats.get(borough) || { count: 0, trips: 0 };
    
    // Find station index in allStations array
    const stationIndex = allStations.findIndex(s => s.id === station.id);
    const tripCount = stationIndex >= 0 ? (stationTripCounts.get(stationIndex) || 0) : 0;
    
    stats.set(borough, {
      count: currentStats.count + 1,
      trips: currentStats.trips + tripCount
    });
  });

  return stats;
}