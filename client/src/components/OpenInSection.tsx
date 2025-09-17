import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface OpenInSectionProps {
  coordinates: { lat: number; lng: number } | null;
}

export default function OpenInSection({ coordinates }: OpenInSectionProps) {
  const [mapLinks, setMapLinks] = useState<Record<string, string>>({});
  const [isLoadingMapLinks, setIsLoadingMapLinks] = useState(false);

  // Map applications list
  const mapApps = [
    { name: "Google Maps", icon: "fab fa-google" },
    { name: "Apple Maps", icon: "fab fa-apple" },
    { name: "Waze", icon: "fas fa-route" },
    { name: "HERE WeGo", icon: "fas fa-map-signs" },
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

  // Fetch map links when coordinates change
  useEffect(() => {
    if (coordinates) {
      setIsLoadingMapLinks(true);
      
      const fetchMapLinks = async () => {
        try {
          const response = await apiRequest("GET", `/api/map-links/${coordinates.lat}/${coordinates.lng}`);
          const data = await response.json();
          setMapLinks(data);
        } catch (error) {
          console.log("Failed to fetch map links:", error);
          setMapLinks({});
        } finally {
          setIsLoadingMapLinks(false);
        }
      };

      fetchMapLinks();
    } else {
      setMapLinks({});
    }
  }, [coordinates]);

  return (
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
            onClick={async (e) => {
              // Track map app click analytics
              if (coordinates) {
                try {
                  await apiRequest("POST", "/api/analytics/map-click", {
                    appName: app.name,
                    latitude: coordinates.lat,
                    longitude: coordinates.lng
                  });
                  console.log(`Tracked click for ${app.name}`);
                } catch (error) {
                  console.log("Analytics tracking failed:", error);
                }
              }
            }}
            className="flex items-center justify-center p-2 bg-addypin-light hover:bg-addypin-cyan hover:text-white transition-all duration-200 rounded-lg text-xs font-medium text-addypin-dark group"
            data-testid={`link-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <i className={`${app.icon} mr-1 group-hover:scale-110 transition-transform text-xs`}></i>
            <span>{app.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}