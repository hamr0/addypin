// Shared utility functions for consistent behavior across client and server

// Comprehensive country detection with 195 UN member states plus major territories
export const getCountryFromCoords = (lat: number, lng: number): string => {
  // Small countries and territories first (most specific bounds)
  
  // Vatican City
  if (lat >= 41.900 && lat <= 41.907 && lng >= 12.445 && lng <= 12.458) return "Vatican City";
  
  // Monaco
  if (lat >= 43.725 && lat <= 43.755 && lng >= 7.405 && lng <= 7.439) return "Monaco";
  
  // San Marino
  if (lat >= 43.893 && lat <= 43.994 && lng >= 12.403 && lng <= 12.518) return "San Marino";
  
  // Liechtenstein
  if (lat >= 47.047 && lat <= 47.270 && lng >= 9.471 && lng <= 9.636) return "Liechtenstein";
  
  // Malta
  if (lat >= 35.780 && lat <= 36.082 && lng >= 14.183 && lng <= 14.577) return "Malta";
  
  // Andorra
  if (lat >= 42.429 && lat <= 42.656 && lng >= 1.413 && lng <= 1.787) return "Andorra";
  
  // Singapore
  if (lat >= 1.159 && lat <= 1.472 && lng >= 103.594 && lng <= 104.130) return "Singapore";
  
  // Bahrain
  if (lat >= 25.535 && lat <= 26.282 && lng >= 50.308 && lng <= 50.664) return "Bahrain";
  
  // Luxembourg
  if (lat >= 49.442 && lat <= 50.129 && lng >= 5.735 && lng <= 6.530) return "Luxembourg";
  
  // Cyprus
  if (lat >= 34.633 && lat <= 35.701 && lng >= 32.256 && lng <= 34.597) return "Cyprus";
  
  // Qatar
  if (lat >= 24.470 && lat <= 26.154 && lng >= 50.743 && lng <= 51.636) return "Qatar";
  
  // Caribbean small islands
  if (lat >= 12.001 && lat <= 13.338 && lng >= -61.887 && lng <= -59.420) return "Barbados";
  if (lat >= 17.061 && lat <= 18.516 && lng >= -63.969 && lng <= -62.971) return "Saint Kitts and Nevis";
  if (lat >= 13.133 && lat <= 13.397 && lng >= -61.461 && lng <= -61.164) return "Grenada";
  if (lat >= 13.023 && lat <= 13.415 && lng >= -61.229 && lng <= -60.874) return "Saint Vincent and the Grenadines";
  if (lat >= 13.696 && lat <= 14.879 && lng >= -61.229 && lng <= -60.874) return "Saint Lucia";
  if (lat >= 15.201 && lat <= 15.645 && lng >= -61.485 && lng <= -61.244) return "Dominica";
  if (lat >= 17.017 && lat <= 18.615 && lng >= -63.969 && lng <= -62.971) return "Antigua and Barbuda";
  
  // Pacific small islands
  if (lat >= 7.314 && lat <= 7.614 && lng >= 134.130 && lng <= 134.685) return "Palau";
  if (lat >= 5.587 && lat <= 10.091 && lng >= 138.033 && lng <= 163.036) return "Federated States of Micronesia";
  if (lat >= 0.126 && lat <= 4.721 && lng >= 166.018 && lng <= 172.059) return "Marshall Islands";
  if (lat >= -9.647 && lat <= -8.416 && lng >= 159.609 && lng <= 162.398) return "Nauru";
  if (lat >= -26.062 && lat <= -15.562 && lng >= -180.0 && lng <= -174.0) return "Tonga";
  if (lat >= -14.373 && lat <= -13.046 && lng >= -172.014 && lng <= -171.390) return "Samoa";
  if (lat >= -22.647 && lat <= -19.683 && lng >= 163.564 && lng <= 167.120) return "Vanuatu";
  if (lat >= -12.708 && lat <= -6.613 && lng >= 155.119 && lng <= 162.398) return "Solomon Islands";
  if (lat >= -20.786 && lat <= -12.482 && lng >= 166.629 && lng <= 167.844) return "Fiji";
  if (lat >= -0.953 && lat <= 3.380 && lng >= 172.912 && lng <= 176.848) return "Kiribati";
  if (lat >= -9.430 && lat <= -8.517 && lng >= 179.194 && lng <= 179.982) return "Tuvalu";
  
  // Europe (specific countries before broader ones)
  if (lat >= 59.676 && lat <= 70.092 && lng >= 4.650 && lng <= 31.078) return "Norway";
  if (lat >= 55.338 && lat <= 69.060 && lng >= 10.968 && lng <= 24.170) return "Sweden";
  if (lat >= 59.809 && lat <= 70.092 && lng >= 20.556 && lng <= 31.587) return "Finland";
  if (lat >= 63.396 && lat <= 66.564 && lng >= -25.013 && lng <= -13.500) return "Iceland";
  if (lat >= 54.559 && lat <= 57.751 && lng >= 8.075 && lng <= 15.158) return "Denmark";
  if (lat >= 51.475 && lat <= 55.361 && lng >= -10.478 && lng <= -5.999) return "Ireland";
  if (lat >= 49.396 && lat <= 60.861 && lng >= -8.179 && lng <= 1.759) return "United Kingdom";
  if (lat >= 50.751 && lat <= 53.555 && lng >= 3.314 && lng <= 7.228) return "Netherlands";
  if (lat >= 49.497 && lat <= 51.505 && lng >= 2.546 && lng <= 6.408) return "Belgium";
  if (lat >= 41.330 && lat <= 51.124 && lng >= -5.143 && lng <= 9.662) return "France";
  if (lat >= 27.638 && lat <= 43.792 && lng >= -18.160 && lng <= 4.327) return "Spain";
  if (lat >= 29.826 && lat <= 42.154 && lng >= -31.266 && lng <= -6.189) return "Portugal";
  if (lat >= 45.818 && lat <= 47.808 && lng >= 5.957 && lng <= 10.492) return "Switzerland";
  if (lat >= 46.372 && lat <= 49.020 && lng >= 9.531 && lng <= 17.160) return "Austria";
  if (lat >= 47.270 && lat <= 55.099 && lng >= 5.866 && lng <= 15.042) return "Germany";
  if (lat >= 48.551 && lat <= 51.055 && lng >= 12.096 && lng <= 18.877) return "Czech Republic";
  if (lat >= 47.728 && lat <= 49.613 && lng >= 16.840 && lng <= 22.558) return "Slovakia";
  if (lat >= 49.003 && lat <= 54.836 && lng >= 14.123 && lng <= 24.150) return "Poland";
  if (lat >= 53.896 && lat <= 56.450 && lng >= 20.971 && lng <= 26.820) return "Lithuania";
  if (lat >= 55.675 && lat <= 58.086 && lng >= 20.974 && lng <= 28.209) return "Latvia";
  if (lat >= 57.474 && lat <= 59.677 && lng >= 21.831 && lng <= 28.210) return "Estonia";
  if (lat >= 51.267 && lat <= 56.172 && lng >= 23.169 && lng <= 32.780) return "Belarus";
  if (lat >= 44.386 && lat <= 52.379 && lng >= 22.137 && lng <= 40.228) return "Ukraine";
  if (lat >= 45.737 && lat <= 48.585 && lng >= 16.113 && lng <= 22.896) return "Hungary";
  if (lat >= 45.421 && lat <= 46.877 && lng >= 13.375 && lng <= 16.610) return "Slovenia";
  if (lat >= 42.394 && lat <= 46.539 && lng >= 13.494 && lng <= 19.427) return "Croatia";
  if (lat >= 42.232 && lat <= 45.277 && lng >= 15.718 && lng <= 19.622) return "Bosnia and Herzegovina";
  if (lat >= 42.232 && lat <= 46.181 && lng >= 18.830 && lng <= 23.006) return "Serbia";
  if (lat >= 41.848 && lat <= 43.568 && lng >= 18.461 && lng <= 20.364) return "Montenegro";
  if (lat >= 42.232 && lat <= 43.268 && lng >= 20.014 && lng <= 21.781) return "Kosovo";
  if (lat >= 40.854 && lat <= 42.359 && lng >= 20.452 && lng <= 23.034) return "North Macedonia";
  if (lat >= 39.645 && lat <= 42.659 && lng >= 19.293 && lng <= 21.068) return "Albania";
  if (lat >= 34.802 && lat <= 41.749 && lng >= 19.374 && lng <= 28.241) return "Greece";
  if (lat >= 35.808 && lat <= 42.107 && lng >= 25.997 && lng <= 44.835) return "Turkey";
  if (lat >= 41.244 && lat <= 44.217 && lng >= 22.357 && lng <= 28.608) return "Bulgaria";
  if (lat >= 43.619 && lat <= 48.266 && lng >= 20.262 && lng <= 29.716) return "Romania";
  if (lat >= 45.943 && lat <= 48.585 && lng >= 19.046 && lng <= 29.749) return "Moldova";
  if (lat >= 35.126 && lat <= 47.095 && lng >= 6.640 && lng <= 18.520) return "Italy";
  if (lat >= 36.020 && lat <= 42.020 && lng >= 39.672 && lng <= 46.636) return "Armenia";
  if (lat >= 38.410 && lat <= 42.558 && lng >= 39.648 && lng <= 46.737) return "Georgia";
  if (lat >= 38.392 && lat <= 41.906 && lng >= 44.793 && lng <= 50.393) return "Azerbaijan";
  if (lat >= 41.151 && lat <= 81.857 && lng >= 19.638 && lng <= 180.0) return "Russia";
  
  // Asia (specific countries first)
  if (lat >= 24.046 && lat <= 45.554 && lng >= 129.408 && lng <= 145.543) return "Japan";
  if (lat >= 33.190 && lat <= 38.612 && lng >= 124.354 && lng <= 131.872) return "South Korea";
  if (lat >= 37.674 && lat <= 43.006 && lng >= 124.265 && lng <= 130.781) return "North Korea";
  if (lat >= 21.917 && lat <= 25.294 && lng >= 120.106 && lng <= 122.006) return "Taiwan";
  if (lat >= 22.155 && lat <= 22.562 && lng >= 113.835 && lng <= 114.441) return "Hong Kong";
  if (lat >= 22.110 && lat <= 22.218 && lng >= 113.545 && lng <= 113.599) return "Macau";
  if (lat >= 4.581 && lat <= 21.072 && lng >= 116.930 && lng <= 126.605) return "Philippines";
  if (lat >= 0.855 && lat <= 7.384 && lng >= 99.644 && lng <= 119.269) return "Malaysia";
  if (lat >= -11.008 && lat <= 6.074 && lng >= 95.011 && lng <= 141.021) return "Indonesia";
  if (lat >= 8.597 && lat <= 23.390 && lng >= 102.145 && lng <= 109.469) return "Vietnam";
  if (lat >= 5.612 && lat <= 20.465 && lng >= 97.343 && lng <= 105.639) return "Thailand";
  if (lat >= 10.409 && lat <= 14.691 && lng >= 102.340 && lng <= 107.628) return "Cambodia";
  if (lat >= 13.910 && lat <= 22.501 && lng >= 100.084 && lng <= 107.697) return "Laos";
  if (lat >= 9.784 && lat <= 28.544 && lng >= 92.172 && lng <= 101.177) return "Myanmar";
  if (lat >= 20.670 && lat <= 26.637 && lng >= 88.028 && lng <= 92.673) return "Bangladesh";
  if (lat >= 26.396 && lat <= 30.447 && lng >= 80.089 && lng <= 88.201) return "Nepal";
  if (lat >= 26.702 && lat <= 28.247 && lng >= 88.746 && lng <= 92.125) return "Bhutan";
  if (lat >= 5.916 && lat <= 9.835 && lng >= 79.697 && lng <= 81.879) return "Sri Lanka";
  if (lat >= 7.064 && lat <= 9.835 && lng >= 72.397 && lng <= 74.317) return "Maldives";
  if (lat >= 29.378 && lat <= 38.484 && lng >= 60.478 && lng <= 74.910) return "Afghanistan";
  if (lat >= 23.688 && lat <= 37.097 && lng >= 60.872 && lng <= 77.837) return "Pakistan";
  if (lat >= 6.755 && lat <= 35.508 && lng >= 68.033 && lng <= 97.395) return "India";
  if (lat >= 35.157 && lat <= 42.751 && lng >= 52.330 && lng <= 66.546) return "Turkmenistan";
  if (lat >= 37.172 && lat <= 43.238 && lng >= 56.191 && lng <= 73.055) return "Uzbekistan";
  if (lat >= 36.738 && lat <= 41.044 && lng >= 67.442 && lng <= 75.158) return "Tajikistan";
  if (lat >= 39.173 && lat <= 43.238 && lng >= 69.464 && lng <= 80.259) return "Kyrgyzstan";
  if (lat >= 36.534 && lat <= 47.043 && lng >= 55.026 && lng <= 87.312) return "Kazakhstan";
  if (lat >= 41.581 && lat <= 52.148 && lng >= 87.751 && lng <= 119.924) return "Mongolia";
  if (lat >= 18.165 && lat <= 53.561 && lng >= 73.557 && lng <= 134.773) return "China";
  if (lat >= 25.071 && lat <= 39.834 && lng >= 44.047 && lng <= 63.317) return "Iran";
  if (lat >= 29.061 && lat <= 37.380 && lng >= 34.268 && lng <= 46.109) return "Iraq";
  if (lat >= 32.312 && lat <= 37.230 && lng >= 35.114 && lng <= 42.349) return "Syria";
  if (lat >= 33.053 && lat <= 34.686 && lng >= 35.100 && lng <= 36.639) return "Lebanon";
  if (lat >= 31.220 && lat <= 33.396 && lng >= 34.216 && lng <= 35.896) return "Israel";
  if (lat >= 31.354 && lat <= 32.545 && lng >= 34.927 && lng <= 35.573) return "Palestine";
  if (lat >= 29.298 && lat <= 33.413 && lng >= 34.884 && lng <= 39.301) return "Jordan";
  if (lat >= 12.111 && lat <= 18.999 && lng >= 42.332 && lng <= 53.108) return "Yemen";
  if (lat >= 16.647 && lat <= 26.389 && lng >= 41.602 && lng <= 55.667) return "Saudi Arabia";
  if (lat >= 28.524 && lat <= 30.095 && lng >= 46.555 && lng <= 48.417) return "Kuwait";
  if (lat >= 16.613 && lat <= 26.396 && lng >= 51.106 && lng <= 59.836) return "Oman";
  if (lat >= 22.633 && lat <= 26.084 && lng >= 51.006 && lng <= 56.396) return "United Arab Emirates";
  
  // Africa
  if (lat >= 19.500 && lat <= 33.158 && lng >= -17.063 && lng <= 11.988) return "Algeria";
  if (lat >= 19.508 && lat <= 33.168 && lng >= 9.950 && lng <= 25.150) return "Libya";
  if (lat >= 22.000 && lat <= 31.667 && lng >= 25.000 && lng <= 35.000) return "Egypt";
  if (lat >= 8.685 && lat <= 22.000 && lng >= 21.826 && lng <= 39.000) return "Sudan";
  if (lat >= 12.359 && lat <= 18.003 && lng >= 33.000 && lng <= 39.000) return "South Sudan";
  if (lat >= 12.362 && lat <= 18.003 && lng >= 36.438 && lng <= 43.134) return "Eritrea";
  if (lat >= 3.406 && lat <= 14.878 && lng >= 32.997 && lng <= 47.986) return "Ethiopia";
  if (lat >= -26.877 && lat <= 5.019 && lng >= 29.174 && lng <= 40.638) return "Tanzania";
  if (lat >= -4.679 && lat <= 4.222 && lng >= 33.893 && lng <= 41.899) return "Kenya";
  if (lat >= -1.478 && lat <= 4.234 && lng >= 29.574 && lng <= 35.000) return "Uganda";
  if (lat >= -2.841 && lat <= 2.276 && lng >= 28.862 && lng <= 30.900) return "Rwanda";
  if (lat >= -4.460 && lat <= -2.309 && lng >= 29.000 && lng <= 30.850) return "Burundi";
  if (lat >= -18.965 && lat <= -4.388 && lng >= 11.734 && lng <= 24.085) return "Angola";
  if (lat >= -34.819 && lat <= -22.127 && lng >= 16.465 && lng <= 32.830) return "South Africa";
  if (lat >= -22.127 && lat <= -17.661 && lng >= 20.469 && lng <= 29.432) return "Botswana";
  if (lat >= -29.045 && lat <= -16.959 && lng >= 11.734 && lng <= 25.261) return "Namibia";
  if (lat >= -26.881 && lat <= -25.719 && lng >= 31.000 && lng <= 32.890) return "Eswatini";
  if (lat >= -30.646 && lat <= -28.570 && lng >= 27.000 && lng <= 29.465) return "Lesotho";
  if (lat >= -22.417 && lat <= -15.608 && lng >= 25.264 && lng <= 33.057) return "Zimbabwe";
  if (lat >= -18.078 && lat <= -8.041 && lng >= 22.000 && lng <= 33.702) return "Zambia";
  if (lat >= -17.125 && lat <= -9.368 && lng >= 32.669 && lng <= 40.639) return "Malawi";
  if (lat >= -26.881 && lat <= -10.471 && lng >= 30.217 && lng <= 40.640) return "Mozambique";
  if (lat >= -25.731 && lat <= -11.695 && lng >= 43.254 && lng <= 50.477) return "Madagascar";
  if (lat >= -20.528 && lat <= -19.995 && lng >= 57.310 && lng <= 57.797) return "Mauritius";
  if (lat >= -4.679 && lat <= -4.176 && lng >= 55.229 && lng <= 55.667) return "Seychelles";
  if (lat >= -12.806 && lat <= -11.365 && lng >= 43.254 && lng <= 45.227) return "Comoros";
  
  // West Africa
  if (lat >= 31.000 && lat <= 37.350 && lng >= -13.178 && lng <= -1.025) return "Morocco";
  if (lat >= 30.230 && lat <= 37.350 && lng >= 7.612 && lng <= 11.988) return "Tunisia";
  if (lat >= 12.000 && lat <= 27.000 && lng >= -17.063 && lng <= -4.833) return "Mauritania";
  if (lat >= 10.740 && lat <= 25.000 && lng >= -12.131 && lng <= 4.267) return "Mali";
  if (lat >= 9.394 && lat <= 15.082 && lng >= -5.207 && lng <= 2.177) return "Burkina Faso";
  if (lat >= 4.736 && lat <= 14.578 && lng >= -8.602 && lng <= 1.207) return "Niger";
  if (lat >= 7.866 && lat <= 23.017 && lng >= 13.473 && lng <= 24.003) return "Chad";
  if (lat >= 7.013 && lat <= 14.130 && lng >= 2.177 && lng <= 14.578) return "Nigeria";
  if (lat >= 6.048 && lat <= 13.078 && lng >= 0.160 && lng <= 3.797) return "Benin";
  if (lat >= 6.104 && lat <= 11.174 && lng >= -0.240 && lng <= 1.207) return "Togo";
  if (lat >= 4.736 && lat <= 12.013 && lng >= -3.264 && lng <= 2.177) return "Ghana";
  if (lat >= 4.357 && lat <= 10.736 && lng >= -8.602 && lng <= -2.494) return "Ivory Coast";
  if (lat >= 4.269 && lat <= 8.551 && lng >= -11.438 && lng <= -7.540) return "Liberia";
  if (lat >= 6.929 && lat <= 10.047 && lng >= -13.124 && lng <= -10.284) return "Sierra Leone";
  if (lat >= 7.194 && lat <= 12.678 && lng >= -15.131 && lng <= -7.540) return "Guinea";
  if (lat >= 10.931 && lat <= 12.678 && lng >= -16.713 && lng <= -13.637) return "Guinea-Bissau";
  if (lat >= 12.308 && lat <= 16.648 && lng >= -17.063 && lng <= -11.355) return "Senegal";
  if (lat >= 13.078 && lat <= 17.524 && lng >= -16.713 && lng <= -5.207) return "Gambia";
  if (lat >= 12.521 && lat <= 15.082 && lng >= -16.713 && lng <= -11.355) return "Cape Verde";
  if (lat >= 2.177 && lat <= 11.174 && lng >= 5.906 && lng <= 16.061) return "Cameroon";
  if (lat >= -3.978 && lat <= 2.177 && lng >= 8.500 && lng <= 18.643) return "Gabon";
  if (lat >= -1.000 && lat <= 4.000 && lng >= 9.302 && lng <= 16.061) return "Equatorial Guinea";
  if (lat >= 0.319 && lat <= 2.177 && lng >= 5.906 && lng <= 11.276) return "Sao Tome and Principe";
  if (lat >= -5.028 && lat <= 5.384 && lng >= 12.204 && lng <= 31.174) return "Central African Republic";
  if (lat >= -13.455 && lat <= 5.384 && lng >= 12.204 && lng <= 31.174) return "Democratic Republic of the Congo";
  if (lat >= -5.028 && lat <= 4.384 && lng >= 11.093 && lng <= 18.643) return "Republic of the Congo";
  
  // North America
  if (lat >= 24.521 && lat <= 49.384 && lng >= -125.0 && lng <= -66.934) return "United States";
  if (lat >= 41.681 && lat <= 83.110 && lng >= -141.003 && lng <= -52.636) return "Canada";
  if (lat >= 14.532 && lat <= 32.719 && lng >= -118.365 && lng <= -86.703) return "Mexico";
  if (lat >= 7.217 && lat <= 11.216 && lng >= -85.941 && lng <= -82.556) return "Costa Rica";
  if (lat >= 7.217 && lat <= 9.647 && lng >= -83.051 && lng <= -77.177) return "Panama";
  if (lat >= 10.735 && lat <= 15.025 && lng >= -87.692 && lng <= -82.556) return "Nicaragua";
  if (lat >= 12.890 && lat <= 16.512 && lng >= -89.343 && lng <= -83.147) return "Honduras";
  if (lat >= 15.883 && lat <= 18.043 && lng >= -92.230 && lng <= -87.692) return "Guatemala";
  if (lat >= 12.408 && lat <= 16.006 && lng >= -90.110 && lng <= -87.692) return "Belize";
  if (lat >= 13.006 && lat <= 14.445 && lng >= -90.110 && lng <= -87.692) return "El Salvador";
  if (lat >= 17.915 && lat <= 25.216 && lng >= -87.534 && lng <= -77.177) return "Cuba";
  if (lat >= 17.615 && lat <= 19.927 && lng >= -77.820 && lng <= -66.947) return "Jamaica";
  if (lat >= 18.018 && lat <= 18.515 && lng >= -74.458 && lng <= -71.613) return "Haiti";
  if (lat >= 17.598 && lat <= 19.927 && lng >= -72.003 && lng <= -68.320) return "Dominican Republic";
  if (lat >= 17.017 && lat <= 18.615 && lng >= -67.969 && lng <= -65.271) return "Puerto Rico";
  
  // South America
  if (lat >= -33.751 && lat <= 5.272 && lng >= -73.982 && lng <= -34.793) return "Brazil";
  if (lat >= -55.061 && lat <= -21.781 && lng >= -73.560 && lng <= -53.651) return "Argentina";
  if (lat >= -18.350 && lat <= -0.039 && lng >= -81.328 && lng <= -68.677) return "Peru";
  if (lat >= 0.649 && lat <= 15.912 && lng >= -73.378 && lng <= -59.758) return "Venezuela";
  if (lat >= -4.228 && lat <= 13.390 && lng >= -79.023 && lng <= -66.869) return "Colombia";
  if (lat >= -55.980 && lat <= -17.499 && lng >= -109.445 && lng <= -66.421) return "Chile";
  if (lat >= -22.896 && lat <= -9.680 && lng >= -69.640 && lng <= -57.453) return "Bolivia";
  if (lat >= -34.982 && lat <= -30.109 && lng >= -58.443 && lng <= -53.073) return "Uruguay";
  if (lat >= -27.096 && lat <= -19.294 && lng >= -62.647 && lng <= -54.294) return "Paraguay";
  if (lat >= 1.269 && lat <= 8.887 && lng >= -67.759 && lng <= -52.021) return "Guyana";
  if (lat >= 1.837 && lat <= 6.004 && lng >= -58.087 && lng <= -53.977) return "Suriname";
  if (lat >= 2.112 && lat <= 5.776 && lng >= -54.603 && lng <= -51.635) return "French Guiana";
  if (lat >= -4.998 && lat <= 2.299 && lng >= -81.078 && lng <= -75.192) return "Ecuador";
  
  // Oceania
  if (lat >= -43.643 && lat <= -10.668 && lng >= 113.338 && lng <= 153.569) return "Australia";
  if (lat >= -47.286 && lat <= -34.131 && lng >= 166.509 && lng <= 178.517) return "New Zealand";
  if (lat >= -10.826 && lat <= -6.177 && lng >= 142.199 && lng <= 153.569) return "Papua New Guinea";
  
  return "Unknown";
};