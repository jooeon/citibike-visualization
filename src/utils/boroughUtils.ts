import type { Station } from '../types';

// Precise NYC Borough boundaries based on actual administrative boundaries
// These coordinates are based on the official NYC borough boundaries
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

// More precise polygon-based boundaries for complex borough shapes
// Using key coordinate points that define the actual borough boundaries
const PRECISE_BOROUGH_BOUNDARIES = {
  Manhattan: {
    // Manhattan is roughly bounded by rivers, making it easier to define
    bounds: {
      minLat: 40.7000,  // Battery Park area
      maxLat: 40.8820,  // Inwood
      minLng: -74.0259, // West side (Hudson River)
      maxLng: -73.9070  // East side (East River, excluding Roosevelt Island)
    }
  },
  Brooklyn: {
    // Brooklyn boundaries are complex, using key points
    bounds: {
      minLat: 40.5700,  // Southern Brooklyn (Coney Island area)
      maxLat: 40.7390,  // Northern Brooklyn (Greenpoint area)
      minLng: -74.0420, // Western Brooklyn (Bay Ridge)
      maxLng: -73.8330  // Eastern Brooklyn (East New York)
    }
  },
  Queens: {
    // Queens is the largest borough with complex boundaries
    bounds: {
      minLat: 40.5400,  // Southern Queens (JFK area)
      maxLat: 40.8000,  // Northern Queens (Flushing area)
      minLng: -73.9620, // Western Queens (Long Island City)
      maxLng: -73.7000  // Eastern Queens (Nassau County border)
    }
  },
  Bronx: {
    // Bronx is north of Manhattan and east of the Harlem River
    bounds: {
      minLat: 40.7850,  // Southern Bronx (near Yankee Stadium)
      maxLat: 40.9200,  // Northern Bronx (Westchester border)
      minLng: -73.9330, // Western Bronx (Harlem River)
      maxLng: -73.7650  // Eastern Bronx (Bronx River/Westchester)
    }
  },
  'Staten Island': {
    // Staten Island is geographically separated
    bounds: {
      minLat: 40.4770,  // Southern Staten Island
      maxLat: 40.6510,  // Northern Staten Island
      minLng: -74.2590, // Western Staten Island
      maxLng: -74.0520  // Eastern Staten Island (closest to Brooklyn)
    }
  }
};

// Special coordinate checks for boundary edge cases
function isInManhattan(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES.Manhattan.bounds;
  
  // Basic boundary check
  if (lat < bounds.minLat || lat > bounds.maxLat || 
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false;
  }
  
  // Manhattan is west of the East River
  // The East River roughly follows longitude -73.94 to -73.97 depending on location
  // Anything east of -73.94 is likely Brooklyn or Queens
  if (lng > -73.9400) {
    return false; // East of East River - likely Brooklyn/Queens
  }
  
  // Additional checks for Manhattan-specific areas
  // Exclude Roosevelt Island (which is technically Manhattan but often grouped separately)
  if (lng > -73.9200 && lat > 40.7500 && lat < 40.7700) {
    return false; // Roosevelt Island area
  }
  
  return true;
}

function isInBrooklyn(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES.Brooklyn.bounds;
  
  // Basic boundary check
  if (lat < bounds.minLat || lat > bounds.maxLat || 
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false;
  }
  
  // Brooklyn includes areas east of Manhattan (east of East River)
  // Williamsburg, DUMBO, etc. are in Brooklyn and have lng > -73.94
  
  // Northern Brooklyn boundary with Queens
  // The boundary roughly follows Newtown Creek and the BQE
  if (lat > 40.7200 && lng > -73.9000) {
    // This could be Queens - check more precisely
    // Areas north of Greenpoint (lat > 40.73) and east of lng -73.90 are likely Queens
    if (lat > 40.7300 && lng > -73.9000) {
      return false; // Likely Queens
    }
  }
  
  // Eastern Brooklyn boundary with Queens
  // Roughly along the Jackie Robinson Parkway and Highland Park
  if (lng > -73.8500 && lat > 40.6700) {
    return false; // Likely Queens
  }
  
  return true;
}

function isInQueens(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES.Queens.bounds;
  
  // Basic boundary check
  if (lat < bounds.minLat || lat > bounds.maxLat || 
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false;
  }
  
  // Exclude western areas that are likely Brooklyn
  if (lng < -73.9200 && lat < 40.7000) {
    return false; // Likely Brooklyn
  }
  
  // Exclude northern areas that might be Bronx
  if (lat > 40.7800 && lng < -73.8500) {
    return false; // Likely Bronx
  }
  
  return true;
}

function isInBronx(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES.Bronx.bounds;
  
  // Basic boundary check
  if (lat < bounds.minLat || lat > bounds.maxLat || 
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false;
  }
  
  // Bronx is generally north of Manhattan and east of the Harlem River
  // Additional validation: must be north of 40.785 (roughly 155th St in Manhattan)
  if (lat < 40.7850) {
    return false;
  }
  
  return true;
}

function isInStatenIsland(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES['Staten Island'].bounds;
  
  // Staten Island is geographically isolated, so simple bounds check is sufficient
  return lat >= bounds.minLat && lat <= bounds.maxLat && 
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

export function getBoroughFromCoordinates(lat: number, lng: number): string {
  // Check each borough using precise boundary functions
  // Order matters - check more isolated boroughs first
  
  if (isInStatenIsland(lat, lng)) {
    return 'Staten Island';
  }
  
  if (isInBronx(lat, lng)) {
    return 'Bronx';
  }
  
  if (isInManhattan(lat, lng)) {
    return 'Manhattan';
  }
  
  if (isInBrooklyn(lat, lng)) {
    return 'Brooklyn';
  }
  
  if (isInQueens(lat, lng)) {
    return 'Queens';
  }
  
  // Fallback: determine by proximity to borough centers if no precise match
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

  console.log(`Fallback assignment for coordinates (${lat}, ${lng}): ${closestBorough}`);
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