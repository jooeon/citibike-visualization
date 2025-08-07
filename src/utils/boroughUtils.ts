import type { Station } from '../types';

// Updated borough boundaries with more accurate coastal definitions
const PRECISE_BOROUGH_BOUNDARIES = {
  Manhattan: {
    bounds: {
      minLat: 40.6990,  // Battery Park area (more inclusive)
      maxLat: 40.8820,  // Inwood
      minLng: -74.0280, // West side (Hudson River, more inclusive)
      maxLng: -73.9070  // East side (East River)
    }
  },
  Brooklyn: {
    bounds: {
      minLat: 40.5680,  // Southern Brooklyn (Coney Island area)
      maxLat: 40.7400,  // Northern Brooklyn (Greenpoint area)
      minLng: -74.0450, // Western Brooklyn (Bay Ridge/Sunset Park)
      maxLng: -73.8300  // Eastern Brooklyn (East New York)
    }
  },
  Queens: {
    bounds: {
      minLat: 40.5420,  // Southern Queens (JFK/Rockaway area)
      maxLat: 40.8030,  // Northern Queens (Flushing/Whitestone)
      minLng: -73.9650, // Western Queens (Long Island City)
      maxLng: -73.6990  // Eastern Queens (Nassau County border)
    }
  },
  Bronx: {
    bounds: {
      minLat: 40.7900,  // Southern Bronx (Mott Haven area)
      maxLat: 40.9180,  // Northern Bronx (Westchester border)
      minLng: -73.9350, // Western Bronx (Harlem River)
      maxLng: -73.7600  // Eastern Bronx (Bronx River/Westchester)
    }
  },
  'Staten Island': {
    bounds: {
      minLat: 40.4950,  // Southern Staten Island
      maxLat: 40.6480,  // Northern Staten Island
      minLng: -74.2600, // Western Staten Island
      maxLng: -74.0500  // Eastern Staten Island (closest to Brooklyn)
    }
  }
};

function isInManhattan(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES.Manhattan.bounds;

  // Basic boundary check
  if (lat < bounds.minLat || lat > bounds.maxLat ||
      lng < bounds.minLng || lng > bounds.maxLng) {
    return false;
  }

  // More precise Manhattan boundaries using the East River
  // Lower Manhattan (below Canal St - lat ~40.720)
  if (lat < 40.7200) {
    // East River boundary is around -73.975 to -73.98
    if (lng > -73.9750) return false;
  }
  // Lower Midtown (Canal to 34th St - lat ~40.720 to 40.750)
  else if (lat < 40.7500) {
    // East River boundary around -73.97
    if (lng > -73.9700) return false;
  }
  // Upper Midtown (34th to 86th St - lat ~40.750 to 40.785)
  else if (lat < 40.7850) {
    // East River boundary around -73.95
    if (lng > -73.9500) return false;
  }
  // Upper East Side to Harlem (86th to 155th St - lat ~40.785 to 40.830)
  else if (lat < 40.8300) {
    // East River/Harlem River boundary around -73.93 to -73.94
    if (lng > -73.9300) return false;
  }
  // Washington Heights/Inwood (above 155th St)
  else {
    // Harlem River boundary - more restrictive to exclude Bronx
    if (lng > -73.9150) return false; // Eastern boundary (Harlem River)
    if (lng < -73.9850) return false; // Western boundary (Hudson River)
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

  // Brooklyn-Manhattan boundary (East River) - more precise
  if (lat > 40.6990 && lat < 40.7400) {
    // Lower Brooklyn - boundary around -73.975 to -73.98
    if (lat < 40.7200 && lng < -73.9750) return false;
    // Mid Brooklyn - boundary around -73.97
    if (lat >= 40.7200 && lat < 40.7350 && lng < -73.9700) return false;
    // Upper Brooklyn - boundary around -73.95
    if (lat >= 40.7350 && lng < -73.9500) return false;
  }

  // Brooklyn-Queens boundary - Newtown Creek and eastern boundaries
  // Northern Brooklyn (Williamsburg/Greenpoint area)
  if (lat > 40.7100 && lng > -73.9500) {
    // Newtown Creek boundary - north of lat 40.735 and east of lng -73.94 is Queens
    if (lat > 40.7350 && lng > -73.9400) {
      return false; // Queens territory
    }
  }

  // Eastern Brooklyn-Queens boundary (Highland Park area)
  if (lng > -73.8500) {
    // Areas north of Ridgewood (lat > 40.690) and east of lng -73.85 are Queens
    if (lat > 40.6900) return false;
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

  // Western Queens-Brooklyn boundary (Newtown Creek)
  if (lng < -73.9400) {
    // Areas south of Newtown Creek (lat < 40.735) are Brooklyn
    if (lat < 40.7350) return false;
  }

  // Queens-Bronx boundary (East River and Bronx Kill)
  if (lat > 40.7850) {
    // Areas west of lng -73.90 and north of lat 40.785 are Bronx
    if (lng < -73.9000) return false;
  }

  // Exclude Manhattan areas (Long Island City is Queens, but very close to Manhattan)
  if (lng < -73.9500 && lat > 40.7400 && lat < 40.7600) {
    // This is the LIC area - still Queens
    return true;
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

  // Bronx is north of the Harlem River
  // Southern boundary with Manhattan is more precisely around lat 40.790
  if (lat < 40.7900) {
    return false;
  }

  // Western boundary - Harlem River and Spuyten Duyvil Creek
  // The Harlem River forms most of the western boundary
  if (lng < -73.9100) {
    return false; // West of Harlem River is Manhattan
  }

  // Eastern boundary with Westchester County
  if (lng > -73.7600) {
    return false; // Too far east
  }

  return true;
}

function isInStatenIsland(lat: number, lng: number): boolean {
  const bounds = PRECISE_BOROUGH_BOUNDARIES['Staten Island'].bounds;

  // Staten Island is geographically isolated, so simple bounds check is sufficient
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
      lng >= bounds.minLng && lng <= bounds.maxLng;
}

// Known problematic areas with manual overrides
const MANUAL_OVERRIDES = new Map([
  ['Broadway & W 185 St', 'Manhattan'],
  ['Broadway & W 192 St', 'Manhattan'],
  ['Broadway & W 220 St', 'Manhattan'],
  ['Isham St & Broadway', 'Manhattan'],
  ['Dyckman St & 10 Ave', 'Manhattan'],
  ['Dyckman St & Henshaw St', 'Manhattan'],
  ['Dyckman St & Staff St', 'Manhattan'],
  ['Seaman Ave & Isham St', 'Manhattan'],
  ['Riverside Dr & Broadway', 'Manhattan'],
  ['Broadway & Ellwood St', 'Manhattan'],
  ['W 190 St & Broadway', 'Manhattan'],
  ['W 218 St & Broadway', 'Manhattan'],
  ['Academy St & Nagle Ave', 'Manhattan'],
  ['Sherman Ave & Thayer St', 'Manhattan'],
  ['W 186 St & St Nicholas Ave', 'Manhattan'],
  ['W 190 St & St Nicholas Ave', 'Manhattan'],
  ['Amsterdam Ave & W 175 St', 'Manhattan'],
  ['Amsterdam Ave & W 180 St', 'Manhattan'],
  ['Amsterdam Ave & W 183 St', 'Manhattan'],
  ['Amsterdam Ave & W 186 St', 'Manhattan'],
  ['Amsterdam Ave & W 189 St', 'Manhattan'],
  ['Seaman Ave & Beak St', 'Manhattan'],
  ['W 218 St & Indian Rd', 'Manhattan'],
  ['W 204 St & Nagle Ave', 'Manhattan'],
  ['Nagle Ave & Ellwood St', 'Manhattan'],
  ['Nagle Ave & Thayer St', 'Manhattan'],
  ['Audubon Ave & Fort George Ave', 'Manhattan'],
  ['W 204 St & Vermilyea Ave', 'Manhattan'],
  ['10 Ave & W 215 St', 'Manhattan'],
  ['Margaret Corbin Plz & Ft Washington Ave', 'Manhattan'],
  ['Audubon Ave & W 179 St', 'Manhattan'],
  // Williamsburg stations that might be misclassified
  ['Wythe Ave & Metropolitan Ave', 'Brooklyn'],
  ['Grand St & Withers St', 'Brooklyn'],
  ['Berry St & N 8 St', 'Brooklyn'],
  ['Dock St & Front St', 'Brooklyn'],
  // Long Island City stations
  ['11 Ave & W 41 St', 'Manhattan'], // Actually Manhattan (Hudson Yards)
  // Queens
  ['Jackson Ave & Hunters Point Ave', 'Queens'],
  ['Ash St & Manhattan Ave', 'Queens'],
  ['46 Rd & 11 St', 'Queens'],
  ['55 Ave & Center Blvd', 'Queens'],
  ['Jackson Ave & 49 Ave', 'Queens'],
  ['Vernon Blvd & 47 Rd', 'Queens'],
  ['5 St & 51 Ave', 'Queens'],
  ['20 Ave & 31 St', 'Queens'],
  ['Vernon Blvd & 50 Ave', 'Queens'],
  ['Center Blvd & 48 Ave', 'Queens'],
  ['Center Blvd & 51 Ave', 'Queens'],
  ['Ditmars Blvd & 19 St', 'Queens'],
  ['Vernon Blvd & 31 Ave', 'Queens'],
  ['Vernon Blvd & 10 St', 'Queens'],
  ['46 Ave & 5 St', 'Queens'],
  ['21 Ave & Crescent St', 'Queens'],
  ['21 Ave & Shore Blvd', 'Queens'],
  ['21 St & 20 Ave', 'Queens'],
  ['21 St & 21 Ave', 'Queens'],
  // Brooklyn
  ['Myrtle Ave & Lewis Ave', 'Brooklyn'],
  ['Flushing Ave & Carlton Ave', 'Brooklyn'],
  ['Henry St & Middagh St', 'Brooklyn'],
  ['Jay St & York St', 'Brooklyn'],
  ['Pearl St & York St', 'Brooklyn'],
  ['Front St & Washington St', 'Brooklyn'],
  ['Bridge St & Front St', 'Brooklyn'],
  ['Bridge St & York St', 'Brooklyn'],
  ['Main St & Plymouth St', 'Brooklyn'],
  ['Sands St & Jay St', 'Brooklyn'],
  ['Adams St & Prospect St', 'Brooklyn'],
  ['Columbia Heights & Cranberry St', 'Brooklyn'],
  ['Franklin St & Dupont St', 'Brooklyn'],
  ['McGuinness Blvd & Eagle St', 'Brooklyn'],
  ['Eagle St & Manhattan Ave', 'Brooklyn'],
  ['Front St & Gold St', 'Brooklyn'],
  ['Front St & Jay St', 'Brooklyn'],
  ['Front St & Pine St', 'Brooklyn'],
  ['Old Fulton St', 'Brooklyn'],
  // South Bronx stations that might be misclassified as Manhattan
  ['Alexander Ave & E 134 St', 'Bronx'],
  ['Brook Ave & E 138 St', 'Bronx'],
  ['Brook Ave & E 141 St', 'Bronx'],
  ['Brook Ave & E 148 St', 'Bronx'],
  ['Brook Ave & E 157 St', 'Bronx'],
  ['E 138 St & 5 Ave', 'Bronx'],
  ['E 138 St & Cypress Ave', 'Bronx'],
  ['E 138 St & Grand Concourse', 'Bronx'],
  ['E 138 St & Park Ave', 'Bronx'],
  ['E 138 St & Willow Ave', 'Bronx'],
  ['E 141 St & Jackson Ave', 'Bronx'],
  ['E 141 St & St Ann\'s Ave', 'Bronx'],
  ['E 142 St & 3 Ave', 'Bronx'],
  ['E 144 St & Brook Ave', 'Bronx'],
  ['E 147 St & Bergen Ave', 'Bronx'],
  ['E 149 St & Eagle Ave', 'Bronx'],
  ['E 149 St & Jackson Ave', 'Bronx'],
  ['E 149 St & Morris Ave', 'Bronx'],
  ['E 149 St & Park Ave', 'Bronx'],
  ['E 153 St & E 157 St', 'Bronx'],
  ['E 155 St & Courtlandt Ave', 'Bronx'],
  ['E 156 St & Brook Ave', 'Bronx'],
  ['E 156 St & Courtlandt Ave', 'Bronx'],
  ['E 157 St & River Ave', 'Bronx'],
  ['E 158 St & Melrose Ave', 'Bronx'],
  ['Courtlandt Ave & E 149 St', 'Bronx'],
  ['Concourse Village East & E 158 St', 'Bronx'],
  ['Concourse Village West & E 156 St', 'Bronx'],
  ['Gerard Ave & E 146 St', 'Bronx'],
  ['Lincoln Ave & E 138 St', 'Bronx'],
  ['Morris Ave & E 142 St', 'Bronx'],
  ['Grand Concourse & E 144 St', 'Bronx'],
  ['Grand Concourse & E 156 St', 'Bronx'],
  ['Jerome Ave & Anderson Ave', 'Bronx'],
  ['Jerome Ave & E 164 St', 'Bronx'],
  ['Jerome Ave & Ogden Ave', 'Bronx'],
  ['E 165 St & Jerome Ave', 'Bronx'],
  ['Popham Ave & W 174 St', 'Bronx'],
  ['W Tremont Ave & Matthewson Rd', 'Bronx'],
  ['Ogden Ave & Merriam Ave', 'Bronx'],
  ['Ogden Ave & W 164 St', 'Bronx'],
  ['Ogden Ave & W 165 St', 'Bronx'],
  ['Nelson Ave & 167 St', 'Bronx'],
  ['Nelson Ave & W 172 St', 'Bronx'],
  ['St Ann\'s Ave & Bruckner Blvd', 'Bronx'],
  ['Willis Ave & Bruckner Blvd', 'Bronx'],
  ['Bronx Shore Comfort Station', 'Bronx'],
  ['Sunken Meadow Comfort Station', 'Bronx'],
  ['Wards Meadow Comfort Station', 'Bronx'],
  ['Willis Ave & E 137 St', 'Bronx'],
  ['Willis Ave & E 141 St', 'Bronx'],
  ['Willis Ave & E 143 St', 'Bronx'],
  ['E 161 St & River Ave', 'Bronx'],
]);

export function getBoroughFromCoordinates(lat: number, lng: number, stationName?: string): string {
  // Check manual overrides first if station name is provided
  if (stationName && MANUAL_OVERRIDES.has(stationName)) {
    const overrideBorough = MANUAL_OVERRIDES.get(stationName)!;
    console.log(`Using manual override for "${stationName}": ${overrideBorough}`);
    return MANUAL_OVERRIDES.get(stationName)!;
  }

  // Check each borough using precise boundary functions
  // Order matters - check most isolated/distinct boroughs first

  if (isInStatenIsland(lat, lng)) {
    return 'Staten Island';
  }

  if (isInManhattan(lat, lng)) {
    return 'Manhattan';
  }

  if (isInBronx(lat, lng)) {
    return 'Bronx';
  }

  if (isInBrooklyn(lat, lng)) {
    return 'Brooklyn';
  }

  if (isInQueens(lat, lng)) {
    return 'Queens';
  }

  // Fallback: determine by proximity to borough centers if no precise match
  const boroughCenters = {
    Manhattan: { lat: 40.7589, lng: -73.9851 },
    Brooklyn: { lat: 40.6892, lng: -73.9442 },
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

  console.log(`Fallback assignment for coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})${stationName ? ` "${stationName}"` : ''}: ${closestBorough}`);
  return closestBorough;
}

export function assignBoroughsToStations(stations: Station[]): Station[] {
  return stations.map(station => ({
    ...station,
    borough: getBoroughFromCoordinates(station.lat, station.lng, station.name)
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