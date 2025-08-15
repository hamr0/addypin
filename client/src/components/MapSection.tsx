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
}

export default function MapSection({ coordinates, onCoordinatesChange, generatedLink, editingPin, isEditing, onEditComplete }: MapSectionProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLinks, setMapLinks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const { location: geoLocation, error: geoError } = useGeolocation();
  const auth = useAuth();
  const { toast } = useToast();

  // Get country from coordinates (placeholder - would use reverse geocoding in production)
  const getCountryFromCoords = (lat: number, lng: number): string => {
    // Simple mapping based on coordinate ranges - would be replaced with proper geocoding
    if (lat >= 49 && lat <= 71 && lng >= -10 && lng <= 30) return "Netherlands"; 
    if (lat >= 20 && lat <= 40 && lng >= 25 && lng <= 40) return "Egypt";
    return "Unknown";
  };

  // Save coordinates mutation
  const saveCoordinatesMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      if (!editingPin?.shortcode) throw new Error("No pin selected for editing");
      const response = await apiRequest("PATCH", `/api/pins/${editingPin.shortcode}`, {
        latitude: coords.lat,
        longitude: coords.lng
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Changes Saved! ✅",
        description: `Pin ${editingPin?.shortcode} coordinates updated successfully`,
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

  // Fetch map links when coordinates change
  const { data: fetchedMapLinks } = useQuery({
    queryKey: ["/api/map-links", coordinates?.lat, coordinates?.lng],
    enabled: !!coordinates,
  });

  useEffect(() => {
    if (fetchedMapLinks && typeof fetchedMapLinks === 'object') {
      setMapLinks(fetchedMapLinks as Record<string, string>);
    }
  }, [fetchedMapLinks]);

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

    // Custom upright pin icon
    const customIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div class="w-6 h-6 bg-addypin-cyan border-2 border-white shadow-lg relative" style="border-radius: 50% 50% 50% 0; transform: rotate(-45deg);">
        <div class="w-2 h-2 bg-white rounded-full absolute top-1 left-1"></div>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: customIcon,
    }).addTo(map);

    // Set initial coordinates
    onCoordinatesChange({ lat: initialLat, lng: initialLng });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onCoordinatesChange({ lat: pos.lat, lng: pos.lng });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onCoordinatesChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

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
    <div className="lg:col-span-2 space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-addypin-dark mb-3 flex items-center">
          <Search className="w-5 h-5 text-addypin-cyan mr-2" />
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-addypin-dark">Drop your pin</h1>
            <p className="text-addypin-medium mt-1">Search above or click to set your location</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm text-addypin-medium">
              <i className="fas fa-map-marker-alt text-addypin-cyan mr-2"></i>
              <span>Location set</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-addypin-dark mb-2 block">
              {isEditing && editingPin ? `Editing ${editingPin.shortcode} - ${getCountryFromCoords(Number(editingPin.latitude), Number(editingPin.longitude))}` : "Pick a location"}
            </Label>
            <p className="text-xs text-gray-500 mb-4">
              {isEditing && editingPin 
                ? "Drag the pin to update coordinates, then click Save Changes below the map" 
                : "Click anywhere on the map or drag the pin to set coordinates"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <Label htmlFor="latitude" className="block text-sm font-medium text-addypin-dark mb-2">
              Latitude
            </Label>
            <Input
              id="latitude"
              type="text"
              value={coordinates ? coordinates.lat.toFixed(6) : ""}
              readOnly
              className="bg-addypin-light border border-gray-300 font-mono text-sm"
              placeholder="52.247904"
              data-testid="input-latitude"
            />
          </div>
          <div>
            <Label htmlFor="longitude" className="block text-sm font-medium text-addypin-dark mb-2">
              Longitude
            </Label>
            <Input
              id="longitude"
              type="text"
              value={coordinates ? coordinates.lng.toFixed(6) : ""}
              readOnly
              className="bg-addypin-light border border-gray-300 font-mono text-sm"
              placeholder="4.761194"
              data-testid="input-longitude"
            />
          </div>
        </div>
        </div>
      </div>

      {/* Map Apps Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-addypin-dark mb-4 flex items-center">
          <i className="fas fa-external-link-alt text-addypin-cyan mr-3"></i>
          Open in Map Apps
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mapApps.map((app) => (
            <a
              key={app.name}
              href={mapLinks[app.name] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-3 bg-addypin-light hover:bg-addypin-cyan hover:text-white transition-all duration-200 rounded-lg text-sm font-medium text-addypin-dark group"
              data-testid={`link-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <i className={`${app.icon} mr-2 group-hover:scale-110 transition-transform`}></i>
              <span>{app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
