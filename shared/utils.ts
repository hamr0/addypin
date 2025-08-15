// Shared utility functions for consistent behavior across client and server

// Get country from coordinates (comprehensive global mapping)
export const getCountryFromCoords = (lat: number, lng: number): string => {
  // North America
  if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) return "USA";
  if (lat >= 45 && lat <= 84 && lng >= -141 && lng <= -52) return "Canada";
  if (lat >= 14.5 && lat <= 32.7 && lng >= -118 && lng <= -86.7) return "Mexico";
  
  // South America
  if (lat >= -55 && lat <= 12.5 && lng >= -81.3 && lng <= -34.8) return "Brazil";
  if (lat >= -55 && lat <= -21.8 && lng >= -73.6 && lng <= -53.6) return "Argentina";
  if (lat >= -18.3 && lat <= -0.04 && lng >= -81.3 && lng <= -68.7) return "Peru";
  if (lat >= 12.4 && lat <= 15.9 && lng >= -73.4 && lng <= -59.8) return "Venezuela";
  if (lat >= -4.2 && lat <= 13.4 && lng >= -79.0 && lng <= -66.9) return "Colombia";
  if (lat >= -26.9 && lat <= -17.8 && lng >= -69.6 && lng <= -57.5) return "Chile";
  if (lat >= -22.9 && lat <= -9.7 && lng >= -69.6 && lng <= -57.5) return "Bolivia";
  if (lat >= -35 && lat <= -30.1 && lng >= -58.4 && lng <= -53.1) return "Uruguay";
  
  // Europe
  if (lat >= 51.2 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8) return "United Kingdom";
  if (lat >= 41.3 && lat <= 51.1 && lng >= -5.1 && lng <= 9.6) return "France";
  if (lat >= 47.3 && lat <= 55.1 && lng >= 5.9 && lng <= 15.0) return "Germany";
  if (lat >= 36.0 && lat <= 47.1 && lng >= 6.6 && lng <= 18.5) return "Italy";
  if (lat >= 35.2 && lat <= 43.8 && lng >= -9.5 && lng <= 4.3) return "Spain";
  if (lat >= 39.2 && lat <= 42.2 && lng >= -9.5 && lng <= -6.2) return "Portugal";
  if (lat >= 50.5 && lat <= 53.7 && lng >= 3.4 && lng <= 7.2) return "Netherlands";
  if (lat >= 50.7 && lat <= 54.7 && lng >= 2.5 && lng <= 6.4) return "Belgium";
  if (lat >= 46.8 && lat <= 49.5 && lng >= 6.0 && lng <= 10.5) return "Switzerland";
  if (lat >= 46.4 && lat <= 49.0 && lng >= 9.5 && lng <= 17.2) return "Austria";
  if (lat >= 55.6 && lat <= 69.1 && lng >= 8.1 && lng <= 31.3) return "Norway";
  if (lat >= 55.3 && lat <= 69.1 && lng >= 11.0 && lng <= 24.2) return "Sweden";
  if (lat >= 59.8 && lat <= 70.1 && lng >= 20.5 && lng <= 31.6) return "Finland";
  if (lat >= 54.6 && lat <= 57.8 && lng >= 8.1 && lng <= 15.2) return "Denmark";
  if (lat >= 49.0 && lat <= 54.8 && lng >= 14.1 && lng <= 24.2) return "Poland";
  if (lat >= 48.5 && lat <= 51.1 && lng >= 12.1 && lng <= 23.0) return "Czech Republic";
  if (lat >= 45.7 && lat <= 49.6 && lng >= 16.8 && lng <= 22.6) return "Hungary";
  if (lat >= 45.8 && lat <= 48.3 && lng >= 20.3 && lng <= 29.7) return "Romania";
  if (lat >= 41.2 && lat <= 44.2 && lng >= 22.4 && lng <= 28.6) return "Bulgaria";
  if (lat >= 39.6 && lat <= 46.2 && lng >= 19.3 && lng <= 23.0) return "Serbia";
  if (lat >= 42.6 && lat <= 46.9 && lng >= 13.4 && lng <= 19.4) return "Croatia";
  if (lat >= 45.4 && lat <= 46.9 && lng >= 13.4 && lng <= 16.6) return "Slovenia";
  if (lat >= 46.2 && lat <= 49.6 && lng >= 16.8 && lng <= 22.6) return "Slovakia";
  if (lat >= 64.0 && lat <= 66.6 && lng >= -25.0 && lng <= -13.5) return "Iceland";
  if (lat >= 53.0 && lat <= 55.4 && lng >= -10.5 && lng <= -6.0) return "Ireland";
  if (lat >= 36.0 && lat <= 42.0 && lng >= 19.3 && lng <= 28.2) return "Greece";
  if (lat >= 35.8 && lat <= 42.1 && lng >= 26.0 && lng <= 45.0) return "Turkey";
  if (lat >= 41.0 && lat <= 43.2 && lng >= 19.3 && lng <= 21.0) return "Montenegro";
  if (lat >= 42.6 && lat <= 43.2 && lng >= 20.1 && lng <= 21.8) return "Kosovo";
  if (lat >= 40.8 && lat <= 42.7 && lng >= 20.5 && lng <= 23.0) return "North Macedonia";
  if (lat >= 39.6 && lat <= 42.7 && lng >= 19.3 && lng <= 21.1) return "Albania";
  if (lat >= 42.6 && lat <= 45.3 && lng >= 15.7 && lng <= 19.6) return "Bosnia and Herzegovina";
  if (lat >= 50.0 && lat <= 60.5 && lng >= 12.0 && lng <= 40.2) return "Ukraine";
  if (lat >= 53.9 && lat <= 56.2 && lng >= 23.2 && lng <= 28.2) return "Belarus";
  if (lat >= 56.0 && lat <= 58.1 && lng >= 21.1 && lng <= 28.2) return "Lithuania";
  if (lat >= 56.0 && lat <= 58.1 && lng >= 20.9 && lng <= 28.2) return "Latvia";
  if (lat >= 57.5 && lat <= 59.7 && lng >= 21.8 && lng <= 28.2) return "Estonia";
  if (lat >= 41.9 && lat <= 71.0 && lng >= 19.6 && lng <= 169.0) return "Russia";
  
  // Asia
  if (lat >= 18.0 && lat <= 54.0 && lng >= 73.0 && lng <= 135.0) return "China";
  if (lat >= 24.0 && lat <= 46.0 && lng >= 129.0 && lng <= 146.0) return "Japan";
  if (lat >= 33.0 && lat <= 43.0 && lng >= 124.0 && lng <= 132.0) return "South Korea";
  if (lat >= 38.0 && lat <= 43.0 && lng >= 124.0 && lng <= 131.0) return "North Korea";
  if (lat >= 6.0 && lat <= 39.0 && lng >= 68.0 && lng <= 97.0) return "India";
  if (lat >= 30.0 && lat <= 37.0 && lng >= 60.0 && lng <= 75.0) return "Afghanistan";
  if (lat >= 23.7 && lat <= 37.1 && lng >= 60.9 && lng <= 77.8) return "Pakistan";
  if (lat >= 20.4 && lat <= 28.5 && lng >= 80.1 && lng <= 92.7) return "Bangladesh";
  if (lat >= 5.9 && lat <= 9.9 && lng >= 79.7 && lng <= 81.9) return "Sri Lanka";
  if (lat >= 26.3 && lat <= 30.4 && lng >= 80.1 && lng <= 88.2) return "Nepal";
  if (lat >= 26.7 && lat <= 28.3 && lng >= 88.8 && lng <= 92.1) return "Bhutan";
  if (lat >= 19.0 && lat <= 29.0 && lng >= 92.2 && lng <= 101.2) return "Myanmar";
  if (lat >= 5.6 && lat <= 20.5 && lng >= 97.3 && lng <= 105.6) return "Thailand";
  if (lat >= 8.6 && lat <= 23.4 && lng >= 102.1 && lng <= 109.5) return "Vietnam";
  if (lat >= 10.4 && lat <= 14.7 && lng >= 102.3 && lng <= 107.6) return "Cambodia";
  if (lat >= 13.9 && lat <= 22.5 && lng >= 100.1 && lng <= 107.7) return "Laos";
  if (lat >= 1.3 && lat <= 7.8 && lng >= 95.0 && lng <= 141.0) return "Indonesia";
  if (lat >= 1.0 && lat <= 7.4 && lng >= 99.6 && lng <= 119.3) return "Malaysia";
  if (lat >= 1.2 && lat <= 1.5 && lng >= 103.6 && lng <= 104.0) return "Singapore";
  if (lat >= 4.0 && lat <= 21.0 && lng >= 116.0 && lng <= 127.0) return "Philippines";
  if (lat >= 22.0 && lat <= 25.3 && lng >= 120.0 && lng <= 122.0) return "Taiwan";
  if (lat >= 34.0 && lat <= 42.0 && lng >= 125.0 && lng <= 130.0) return "Mongolia";
  if (lat >= 29.0 && lat <= 37.4 && lng >= 44.0 && lng <= 63.3) return "Iran";
  
  // Middle East
  if (lat >= 24.4 && lat <= 26.2 && lng >= 50.7 && lng <= 51.7) return "Qatar";
  if (lat >= 22.5 && lat <= 26.1 && lng >= 51.0 && lng <= 56.4) return "UAE";
  if (lat >= 16.3 && lat <= 32.2 && lng >= 34.5 && lng <= 55.7) return "Saudi Arabia";
  if (lat >= 33.0 && lat <= 37.4 && lng >= 35.7 && lng <= 42.4) return "Syria";
  if (lat >= 29.0 && lat <= 37.4 && lng >= 38.8 && lng <= 48.8) return "Iraq";
  if (lat >= 31.2 && lat <= 33.4 && lng >= 34.3 && lng <= 35.7) return "Israel";
  if (lat >= 29.2 && lat <= 33.4 && lng >= 34.9 && lng <= 39.3) return "Jordan";
  if (lat >= 33.1 && lat <= 34.7 && lng >= 35.1 && lng <= 36.6) return "Lebanon";
  if (lat >= 28.5 && lat <= 30.1 && lng >= 46.5 && lng <= 48.4) return "Kuwait";
  if (lat >= 20.1 && lat <= 27.1 && lng >= 50.5 && lng <= 59.8) return "Oman";
  if (lat >= 25.8 && lat <= 26.7 && lng >= 50.1 && lng <= 50.7) return "Bahrain";
  if (lat >= 12.1 && lat <= 19.0 && lng >= 42.0 && lng <= 54.0) return "Yemen";
  
  // Africa
  if (lat >= 22.0 && lat <= 31.7 && lng >= 25.0 && lng <= 37.0) return "Egypt";
  if (lat >= 3.4 && lat <= 23.0 && lng >= 21.8 && lng <= 39.0) return "Sudan";
  if (lat >= 8.0 && lat <= 18.0 && lng >= 21.8 && lng <= 35.0) return "South Sudan";
  if (lat >= 2.0 && lat <= 16.0 && lng >= 7.9 && lng <= 16.2) return "Chad";
  if (lat >= 9.4 && lat <= 23.5 && lng >= -17.1 && lng <= 16.0) return "Libya";
  if (lat >= 18.0 && lat <= 27.3 && lng >= -17.1 && lng <= -4.8) return "Algeria";
  if (lat >= 27.7 && lat <= 37.5 && lng >= -13.2 && lng <= 12.0) return "Tunisia";
  if (lat >= 21.0 && lat <= 35.9 && lng >= -17.1 && lng <= -1.0) return "Morocco";
  if (lat >= 4.0 && lat <= 15.1 && lng >= -5.5 && lng <= 2.2) return "Ghana";
  if (lat >= 6.5 && lat <= 13.9 && lng >= 2.2 && lng <= 14.6) return "Nigeria";
  if (lat >= -35.0 && lat <= -22.1 && lng >= 16.5 && lng <= 33.0) return "South Africa";
  if (lat >= -26.9 && lat <= -17.8 && lng >= 20.0 && lng <= 33.0) return "Botswana";
  if (lat >= -22.7 && lat <= -16.6 && lng >= 20.0 && lng <= 30.0) return "Zimbabwe";
  if (lat >= -18.1 && lat <= -8.2 && lng >= 12.2 && lng <= 24.1) return "Angola";
  if (lat >= -13.0 && lat <= 0.3 && lng >= 12.2 && lng <= 31.2) return "Democratic Republic of Congo";
  if (lat >= -5.0 && lat <= 4.4 && lng >= 11.2 && lng <= 18.6) return "Republic of Congo";
  if (lat >= -2.3 && lat <= 3.8 && lng >= 8.5 && lng <= 16.2) return "Cameroon";
  if (lat >= -1.5 && lat <= 4.2 && lng >= 29.3 && lng <= 30.9) return "Rwanda";
  if (lat >= -4.5 && lat <= 0.4 && lng >= 29.3 && lng <= 35.0) return "Uganda";
  if (lat >= -11.7 && lat <= -0.95 && lng >= 29.3 && lng <= 40.5) return "Tanzania";
  if (lat >= -25.0 && lat <= -9.4 && lng >= 32.7 && lng <= 40.8) return "Mozambique";
  if (lat >= -26.9 && lat <= -15.6 && lng >= 25.0 && lng <= 33.0) return "Zambia";
  if (lat >= -18.0 && lat <= -9.4 && lng >= 23.2 && lng <= 33.7) return "Malawi";
  if (lat >= -1.3 && lat <= 5.0 && lng >= 33.9 && lng <= 41.9) return "Kenya";
  if (lat >= 3.4 && lat <= 18.0 && lng >= 33.0 && lng <= 49.0) return "Ethiopia";
  if (lat >= 8.0 && lat <= 18.0 && lng >= 36.4 && lng <= 43.1) return "Eritrea";
  if (lat >= 8.0 && lat <= 12.0 && lng >= 42.0 && lng <= 51.4) return "Somalia";
  if (lat >= 9.5 && lat <= 15.2 && lng >= -5.5 && lng <= 2.2) return "Burkina Faso";
  if (lat >= 10.0 && lat <= 25.0 && lng >= -12.2 && lng <= 4.3) return "Mali";
  if (lat >= 12.0 && lat <= 23.5 && lng >= 2.2 && lng <= 16.0) return "Niger";
  if (lat >= 14.0 && lat <= 27.5 && lng >= -17.1 && lng <= -4.8) return "Mauritania";
  if (lat >= 12.5 && lat <= 16.7 && lng >= -17.1 && lng <= -11.3) return "Senegal";
  
  // Oceania
  if (lat >= -44.0 && lat <= -10.0 && lng >= 113.0 && lng <= 154.0) return "Australia";
  if (lat >= -47.3 && lat <= -34.4 && lng >= 166.4 && lng <= 178.5) return "New Zealand";
  if (lat >= -18.3 && lat <= -12.5 && lng >= 177.0 && lng <= -177.0) return "Fiji";
  if (lat >= -21.2 && lat <= -19.7 && lng >= 169.5 && lng <= 170.0) return "New Caledonia";
  if (lat >= -17.8 && lat <= -15.9 && lng >= -149.9 && lng <= -148.0) return "French Polynesia";
  
  return "Unknown";
};