import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, X, LocateFixed, Save } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pin } from "@shared/schema";
import { getCountryFromCoords } from "@shared/utils";


// Fix for default markers in Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapSectionProps {
  coordinates: { lat: number; lng: number } | null;
  onCoordinatesChange: (coords: { lat: number; lng: number }) => void;
  generatedLink: { webLink: string; emailLink: string } | null;
  editingPin?: Pin;
  isEditing?: boolean;
  onEditComplete?: (newCoords: { lat: number; lng: number }) => void;
  userEmail?: string;
  otpCode?: string;
  readOnly?: boolean;
}

export default function MapSection({ coordinates, onCoordinatesChange, generatedLink, editingPin, isEditing, onEditComplete, userEmail, otpCode, readOnly = false }: MapSectionProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLinks, setMapLinks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMapLinks, setIsLoadingMapLinks] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mapLinksCache = useRef<Map<string, Record<string, string>>>(new Map());
  
  const { location: geoLocation, error: geoError } = useGeolocation();
  const auth = useAuth();
  const { toast } = useToast();

  // Save coordinates mutation
  const saveCoordinatesMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      if (!editingPin?.shortcode) throw new Error("No pin selected for editing");
      if (!userEmail || !otpCode) throw new Error("Email and OTP code required for editing");
      
      const response = await apiRequest("PATCH", `/api/pins/${editingPin.shortcode}`, {
        latitude: coords.lat.toString(),
        longitude: coords.lng.toString(),
        email: userEmail,
        otpCode: otpCode
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Changes Saved! ✅",
        description: `addypin ${editingPin?.shortcode} coordinates updated successfully`,
        variant: "default",
      });
      // Trigger pin list refresh
      window.dispatchEvent(new CustomEvent('pinUpdated'));
      if (onEditComplete && coordinates) {
        onEditComplete(coordinates);
      }
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save coordinates",
        variant: "destructive",
      });
    },
  });

  // Debounced map links fetching
  const fetchMapLinksDebounced = (coords: { lat: number; lng: number }) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const cacheKey = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    const cached = mapLinksCache.current.get(cacheKey);
    if (cached) {
      setMapLinks(cached);
      setIsLoadingMapLinks(false);
      return;
    }

    setIsLoadingMapLinks(true);
    
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/map-links/${coords.lat}/${coords.lng}`);
        if (response.ok) {
          const newMapLinks = await response.json();
          setMapLinks(newMapLinks);
          mapLinksCache.current.set(cacheKey, newMapLinks);
        }
      } catch (error) {
        console.error("Error fetching map links:", error);
      } finally {
        setIsLoadingMapLinks(false);
      }
    }, 500);
  };

  useEffect(() => {
    if (coordinates) {
      fetchMapLinksDebounced(coordinates);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [coordinates]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = geoLocation?.coords.latitude || 52.247904;
    const initialLng = geoLocation?.coords.longitude || 4.761194;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: !readOnly,
    }).addTo(map);

    // Set initial coordinates
    onCoordinatesChange({ lat: initialLat, lng: initialLng });

    if (!readOnly) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCoordinatesChange({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onCoordinatesChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [geoLocation, onCoordinatesChange, auth.isAuthenticated]);

  // Marker is always draggable for coordinate selection

  // Update marker position when coordinates change externally
  useEffect(() => {
    if (coordinates && markerRef.current) {
      markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
      if (mapRef.current) {
        mapRef.current.setView([coordinates.lat, coordinates.lng], mapRef.current.getZoom());
      }
    }
  }, [coordinates]);

  // Search functionality
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    
    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Update map view and marker
        mapRef.current.setView([lat, lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        onCoordinatesChange({ lat, lng });
      } else {
        alert("Location not found. Try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search and get current location
  const handleClearSearch = () => {
    setSearchQuery("");
    
    // Get current location if available
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Update map view and marker
          mapRef.current?.setView([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
          onCoordinatesChange({ lat, lng });
        },
        (error) => {
          console.log("Geolocation error:", error);
          // Silently fail - user can manually set location
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
      );
    }
  };

  const mapApps = [
    { name: "Google Maps", icon: "fab fa-google" },
    { name: "Apple Maps", icon: "fab fa-apple" },
    { name: "Waze", icon: "fas fa-route" },
    { name: "HERE WeGo", icon: "fas fa-map" },
    { name: "MapQuest", icon: "fas fa-compass" },
    { name: "Maps.me", icon: "fas fa-map-marked-alt" },
    { name: "OpenStreetMap", icon: "fas fa-globe" },
    { name: "Bing Maps", icon: "fab fa-microsoft" },
    { name: "TomTom", icon: "fas fa-car" },
    { name: "Citymapper", icon: "fas fa-subway" },
    { name: "OsmAnd", icon: "fas fa-location-arrow" },
    { name: "Sygic Maps", icon: "fas fa-road" },
    { name: "Badger Maps", icon: "fas fa-briefcase" },
  ];

  return (
    <div className="lg:col-span-2 space-y-3">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-addypin-dark mb-2 flex items-center">
          <Search className="w-4 h-4 text-addypin-cyan mr-2" />
          Search Location
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for an address, city, or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 placeholder:text-gray-400"
              data-testid="input-location-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isSearching || !searchQuery.trim()}
            className="bg-addypin-cyan hover:bg-addypin-cyan/90"
            data-testid="button-search"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>Search</>
            )}
          </Button>
          <Button
            type="button"
            onClick={handleClearSearch}
            variant="outline"
            className="border-addypin-cyan text-addypin-cyan hover:bg-addypin-cyan hover:text-white"
            data-testid="button-current-location"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-addypin-dark">Pick your addypin</h1>
            <p className="text-addypin-medium text-sm">Click anywhere on the map or drag addypin to set coordinates</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-xs text-addypin-medium">
              <i className="fas fa-map-marker-alt text-addypin-cyan mr-1"></i>
              <span>Location set</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-addypin-dark mb-2 block">
              {isEditing && editingPin ? `Editing ${editingPin.shortcode} - ${getCountryFromCoords(Number(editingPin.latitude), Number(editingPin.longitude))}` : ""}
            </Label>
            <p className="text-xs text-gray-500 mb-4">
              {isEditing && editingPin 
                ? "Drag the addypin to update coordinates, then click Save Changes below the map" 
                : ""
              }
            </p>
            <div 
              ref={mapContainerRef}
              className="w-full h-80 bg-addypin-light rounded-xl shadow-inner"
              data-testid="map-container"
            />
            
            {/* Save Changes Button - appears under map during editing */}
            {isEditing && editingPin && coordinates && (
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-yellow-800">
                      Editing {editingPin.shortcode} - {getCountryFromCoords(Number(editingPin.latitude), Number(editingPin.longitude))}
                    </div>
                    <div className="text-sm text-yellow-700">
                      New coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (coordinates) {
                        saveCoordinatesMutation.mutate(coordinates);
                      }
                    }}
                    disabled={saveCoordinatesMutation.isPending}
                    className="bg-addypin-cyan hover:bg-cyan-600 text-white"
                    data-testid="button-save-changes"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveCoordinatesMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div>
            <Label htmlFor="latitude" className="block text-xs font-medium text-addypin-dark mb-1">
              Latitude
            </Label>
            <Input
              id="latitude"
              type="text"
              value={coordinates ? coordinates.lat.toFixed(6) : ""}
              readOnly
              className="bg-addypin-light border border-gray-300 font-mono text-xs h-8"
              placeholder="52.247904"
              data-testid="input-latitude"
            />
          </div>
          <div>
            <Label htmlFor="longitude" className="block text-xs font-medium text-addypin-dark mb-1">
              Longitude
            </Label>
            <Input
              id="longitude"
              type="text"
              value={coordinates ? coordinates.lng.toFixed(6) : ""}
              readOnly
              className="bg-addypin-light border border-gray-300 font-mono text-xs h-8"
              placeholder="4.761194"
              data-testid="input-longitude"
            />
          </div>
        </div>
        </div>
      </div>

      {/* Map Apps Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-addypin-dark mb-3 flex items-center">
          <i className="fas fa-external-link-alt text-addypin-cyan mr-2"></i>
          Open in
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {mapApps.map((app) => (
            <a
              key={app.name}
              href={mapLinks[app.name] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 bg-addypin-light hover:bg-addypin-cyan hover:text-white transition-all duration-200 rounded-lg text-xs font-medium text-addypin-dark group"
              data-testid={`link-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <i className={`${app.icon} mr-1 group-hover:scale-110 transition-transform text-xs`}></i>
              <span>{app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
