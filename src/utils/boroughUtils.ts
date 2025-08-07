import type { Station } from '../types';

// Updated borough boundaries with more accurate coastal definitions
const PRECISE_BOROUGH_BOUNDARIES = {
  Manhattan: {
    bounds: {
      minLat: 40.7000,  // Battery Park area
      maxLat: 40.8820,  // Inwood
      minLng: -74.0259, // West side (Hudson River)
      maxLng: -73.9070  // East side (East River, excluding Roosevelt Island)
    }
  },
  Brooklyn: {
    bounds: {
      minLat: 40.5700,  // Southern Brooklyn (Coney Island area)
      maxLat: 40.7390,  // Northern Brooklyn (Greenpoint area)
      minLng: -74.0420, // Western Brooklyn (Bay Ridge)
      maxLng: -73.8330  // Eastern Brooklyn (East New York)
    }
  },
  Queens: {
    bounds: {
      minLat: 40.5400,  // Southern Queens (JFK area)
      maxLat: 40.8000,  // Northern Queens (Flushing area)
      minLng: -73.9620, // Western Queens (Long Island City)
      maxLng: -73.7000  // Eastern Queens (Nassau County border)
    }
  },
  Bronx: {
    bounds: {
      minLat: 40.7850,  // Southern Bronx (near Yankee Stadium)
      maxLat: 40.9200,  // Northern Bronx (Westchester border)
      minLng: -73.9330, // Western Bronx (Harlem River)
      maxLng: -73.7650  // Eastern Bronx (Bronx River/Westchester)
    }
  },
  'Staten Island': {
    bounds: {
      minLat: 40.4770,  // Southern Staten Island
      maxLat: 40.6510,  // Northern Staten Island
      minLng: -74.2590, // Western Staten Island
      maxLng: -74.0520  // Eastern Staten Island (closest to Brooklyn)
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

  // Manhattan is an island - more precise water boundary definitions
  // The East River varies in longitude from about -73.93 to -73.97

  // Lower Manhattan (below 14th St - lat ~40.735)
  if (lat < 40.7350) {
    // East River is wider here, boundary around -73.97
    if (lng > -73.9700) return false;
  }
  // Midtown Manhattan (14th to 59th St - lat ~40.735 to 40.765)
  else if (lat < 40.7650) {
    // East River boundary around -73.95
    if (lng > -73.9500) return false;
  }
  // Upper Manhattan (59th to 155th St - lat ~40.765 to 40.830)
  else if (lat < 40.8300) {
    // East River boundary around -73.93 to -73.94
    if (lng > -73.9350) return false;
  }
  // Northern Manhattan (above 155th St - Washington Heights/Inwood)
  else {
    // More restrictive boundaries to exclude South Bronx
    // Northern Manhattan is narrower and bounded more tightly
    if (lng > -73.9200) return false; // Eastern boundary
    if (lng < -73.9800) return false; // Western boundary (Hudson River)

    // Additional northern boundary restriction
    // Above 207th St (lat ~40.870), very few Manhattan stations
    if (lat > 40.8700) {
      // Even more restrictive for northernmost tip
      if (lng > -73.9150 || lng < -73.9400) return false;
    }
  }

  // Exclude Roosevelt Island (technically Manhattan but geographically separate)
  if (lng > -73.9200 && lat > 40.7500 && lat < 40.7700) {
    return false; // Roosevelt Island area
  }

  // Exclude areas that are clearly South Bronx
  // Areas east of the Harlem River and north of 155th St
  if (lat > 40.8300 && lng > -73.9200) {
    return false; // Likely South Bronx
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

  // Brooklyn-Manhattan boundary (East River)
  // If we're in the latitude range of Manhattan but west of East River, it's not Brooklyn
  if (lat > 40.7000 && lat < 40.8820) {
    // Lower Brooklyn/Manhattan boundary
    if (lat < 40.7350 && lng < -73.9700) return false;
    // Mid Brooklyn/Manhattan boundary
    if (lat >= 40.7350 && lat < 40.7650 && lng < -73.9500) return false;
    // Upper Brooklyn/Manhattan boundary
    if (lat >= 40.7650 && lng < -73.9350) return false;
  }

  // Brooklyn-Queens boundary (more complex)
  // Northern Brooklyn (Greenpoint/LIC area) - boundary around Newtown Creek
  if (lat > 40.7200 && lng > -73.9400) {
    // North of Greenpoint Bridge (lat ~40.734) and east of lng -73.94 is likely Queens
    if (lat > 40.7340 && lng > -73.9400) {
      // Exception for Greenpoint itself (stays Brooklyn until lng -73.93)
      if (lat < 40.7380 && lng < -73.9300) {
        return true; // Still Brooklyn
      }
      return false; // Queens
    }
  }

  // Eastern Brooklyn-Queens boundary
  // Roughly follows Highland Park and Jackie Robinson Parkway
  if (lng > -73.8600) {
    // Northern areas east of Highland Park are Queens
    if (lat > 40.6850) return false;
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

  // Western Queens-Brooklyn boundary
  if (lng < -73.9000) {
    // Areas south of Greenpoint (lat < 40.734) are Brooklyn
    if (lat < 40.7340) return false;
  }

  // Western Queens-Manhattan boundary (around Long Island City)
  if (lng < -73.9400 && lat > 40.7400 && lat < 40.7700) {
    // This narrow strip is still Queens (LIC area)
    return true;
  }

  // Queens-Bronx boundary (roughly along East River and Hell Gate)
  if (lat > 40.7800) {
    // Areas west of lng -73.90 and north of lat 40.78 could be Bronx
    if (lng < -73.9000) return false;
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

  // Bronx is north of the Harlem River and east of the Hudson
  // Southern boundary with Manhattan is around 155th Street (lat ~40.785)
  if (lat < 40.7850) {
    return false;
  }

  // Refined western boundary to exclude northern Manhattan
  // The Harlem River and Spuyten Duyvil Creek form the boundary

  // The Harlem River runs roughly north-south, then curves east
  // Most of the Bronx boundary with Manhattan is east of -73.91

  // For areas below the northern tip of Manhattan
  if (lat < 40.8750) {
    // Northern Manhattan (Washington Heights/Inwood) extends to about -73.91
    // Bronx must be significantly east of this
    if (lng < -73.9050) {
      return false; // Still northern Manhattan
    }
  }
  // For the northernmost areas where Spuyten Duyvil Creek forms boundary
  else {
    // Above northern Manhattan, standard Harlem River boundary
    if (lng < -73.9200) {
      return false;
    }
  }

  // Specific exclusions for northern Manhattan areas that extend east
  // Washington Heights area
  if (lat > 40.8400 && lat < 40.8650 && lng > -73.9400 && lng < -73.9050) {
    return false; // Washington Heights
  }

  // Inwood area (northern tip of Manhattan)
  if (lat > 40.8650 && lat < 40.8820 && lng > -73.9300 && lng < -73.9050) {
    return false; // Inwood
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
    return MANUAL_OVERRIDES.get(stationName)!;
  }

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

  console.log(`Fallback assignment for coordinates (${lat}, ${lng})${stationName ? ` "${stationName}"` : ''}: ${closestBorough}`);
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