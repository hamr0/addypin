// Shared utility functions for consistent behavior across client and server

// Get country from coordinates (enhanced coordinate mapping)
export const getCountryFromCoords = (lat: number, lng: number): string => {
  // Enhanced coordinate ranges for better country detection
  if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) return "USA";
  if (lat >= 4 && lat <= 21 && lng >= 116 && lng <= 127) return "Philippines";
  if (lat >= 50.5 && lat <= 53.7 && lng >= 3.2 && lng <= 7.3) return "Netherlands";
  if (lat >= 30 && lat <= 37 && lng >= 66 && lng <= 78) return "Pakistan"; 
  if (lat >= 51.2 && lat <= 56 && lng >= -5.8 && lng <= 2) return "United Kingdom";
  if (lat >= 47 && lat <= 55.1 && lng >= 5.9 && lng <= 15.0) return "Germany";
  if (lat >= 41.3 && lat <= 51.1 && lng >= -5.5 && lng <= 9.6) return "France";
  if (lat >= 22 && lat <= 32 && lng >= 25 && lng <= 37) return "Egypt";
  if (lat >= 45 && lat <= 69 && lng >= -141 && lng <= -52) return "Canada";
  if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return "Australia";
  return "Unknown";
};