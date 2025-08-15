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
  
  // Middle East countries
  if (lat >= 24.4 && lat <= 26.2 && lng >= 50.7 && lng <= 51.7) return "Qatar";
  if (lat >= 22.5 && lat <= 26.1 && lng >= 51.0 && lng <= 56.4) return "UAE";
  if (lat >= 16.3 && lat <= 32.2 && lng >= 38.8 && lng <= 55.7) return "Saudi Arabia";
  if (lat >= 29.0 && lat <= 37.4 && lng >= 44.8 && lng <= 63.3) return "Iran";
  if (lat >= 33.0 && lat <= 37.4 && lng >= 35.7 && lng <= 42.4) return "Syria";
  if (lat >= 32.0 && lat <= 37.4 && lng >= 38.8 && lng <= 48.8) return "Iraq";
  if (lat >= 31.2 && lat <= 33.4 && lng >= 34.9 && lng <= 35.7) return "Israel";
  if (lat >= 31.2 && lat <= 33.4 && lng >= 35.0 && lng <= 39.3) return "Jordan";
  if (lat >= 29.3 && lat <= 33.4 && lng >= 34.9 && lng <= 36.6) return "Lebanon";
  if (lat >= 28.0 && lat <= 31.7 && lng >= 46.5 && lng <= 50.2) return "Kuwait";
  if (lat >= 20.1 && lat <= 27.1 && lng >= 50.5 && lng <= 59.8) return "Oman";
  if (lat >= 16.0 && lat <= 19.0 && lng >= 41.6 && lng <= 54.0) return "Yemen";
  
  return "Unknown";
};