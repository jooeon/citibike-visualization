// Time-based color utilities for day/night cycle effects

export interface TimeColor {
  r: number;
  g: number;
  b: number;
  opacity: number;
}

export function getTimeBasedBackgroundColor(date: Date): TimeColor {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeDecimal = hour + minute / 60; // Convert to decimal hours (e.g., 6.5 for 6:30)

  // Define color stops for 24-hour cycle with realistic day/night transitions
  // Using overlay colors that will blend with the black map background
  const colorStops = [
    { time: 0, color: { r: 0, g: 0, b: 0, opacity: 0.9 } },        // Midnight - deep black overlay
    { time: 2, color: { r: 5, g: 5, b: 15, opacity: 0.85 } },      // Deep night - very dark blue
    { time: 4, color: { r: 10, g: 10, b: 25, opacity: 0.8 } },     // Pre-dawn - dark blue
    { time: 5.5, color: { r: 20, g: 15, b: 40, opacity: 0.75 } },  // Early dawn - purple-blue
    { time: 6.5, color: { r: 60, g: 40, b: 80, opacity: 0.6 } },   // Sunrise start - purple
    { time: 7.5, color: { r: 120, g: 80, b: 60, opacity: 0.45 } }, // Sunrise - warm orange
    { time: 9, color: { r: 180, g: 160, b: 120, opacity: 0.3 } },  // Morning - warm light
    { time: 11, color: { r: 220, g: 220, b: 200, opacity: 0.15 } }, // Late morning - very light
    { time: 13, color: { r: 255, g: 255, b: 255, opacity: 0.05 } }, // Noon - almost white
    { time: 15, color: { r: 240, g: 240, b: 220, opacity: 0.1 } },  // Afternoon - slight warm tint
    { time: 17, color: { r: 200, g: 180, b: 140, opacity: 0.2 } },  // Late afternoon - golden
    { time: 18.5, color: { r: 150, g: 100, b: 80, opacity: 0.4 } }, // Sunset start - orange
    { time: 19.5, color: { r: 100, g: 60, b: 100, opacity: 0.6 } }, // Sunset - purple-orange
    { time: 21, color: { r: 40, g: 30, b: 60, opacity: 0.75 } },    // Dusk - purple
    { time: 22, color: { r: 20, g: 15, b: 40, opacity: 0.8 } },     // Early night - dark blue
    { time: 24, color: { r: 0, g: 0, b: 0, opacity: 0.9 } }         // Midnight - deep black
  ];

  // Find the two color stops to interpolate between
  let startStop = colorStops[0];
  let endStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (timeDecimal >= colorStops[i].time && timeDecimal <= colorStops[i + 1].time) {
      startStop = colorStops[i];
      endStop = colorStops[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const timeDiff = endStop.time - startStop.time;
  const factor = timeDiff === 0 ? 0 : (timeDecimal - startStop.time) / timeDiff;

  // Interpolate color values
  const r = Math.round(startStop.color.r + (endStop.color.r - startStop.color.r) * factor);
  const g = Math.round(startStop.color.g + (endStop.color.g - startStop.color.g) * factor);
  const b = Math.round(startStop.color.b + (endStop.color.b - startStop.color.b) * factor);
  const opacity = startStop.color.opacity + (endStop.color.opacity - startStop.color.opacity) * factor;

  return { r, g, b, opacity };
}

export function formatTimeColor(timeColor: TimeColor): string {
  return `rgba(${timeColor.r}, ${timeColor.g}, ${timeColor.b}, ${timeColor.opacity})`;
}

// Get a readable description of the current time period
export function getTimePeriodDescription(date: Date): string {
  const hour = date.getHours();
  
  if (hour >= 0 && hour < 5) return 'Deep Night';
  if (hour >= 5 && hour < 6) return 'Pre-Dawn';
  if (hour >= 6 && hour < 8) return 'Sunrise';
  if (hour >= 8 && hour < 10) return 'Morning';
  if (hour >= 10 && hour < 16) return 'Midday';
  if (hour >= 16 && hour < 18) return 'Afternoon';
  if (hour >= 18 && hour < 20) return 'Sunset';
  if (hour >= 20 && hour < 22) return 'Dusk';
  return 'Night';
}