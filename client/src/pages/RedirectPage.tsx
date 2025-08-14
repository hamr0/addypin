import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";

interface Pin {
  id: string;
  shortcode: string;
  latitude: string;
  longitude: string;
  createdAt: string;
  userEmail?: string;
  isActive: boolean;
}

interface MapLinks {
  [key: string]: string;
}

export default function RedirectPage() {
  const [, params] = useRoute("/redirect/:shortcode");
  const shortcode = params?.shortcode;

  const { data: pin, isLoading, error } = useQuery({
    queryKey: ["/api/pins", shortcode],
    enabled: !!shortcode,
  });

  const { data: mapLinks } = useQuery({
    queryKey: ["/api/map-links", pin?.latitude, pin?.longitude],
    enabled: !!pin,
  });

  const typedPin = pin as Pin;
  const typedMapLinks = mapLinks as MapLinks;

  if (!shortcode) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <Logo />
              <p className="mt-4 text-sm text-gray-600">Invalid shortcode</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <Logo />
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-addypin-cyan"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">Loading location...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !typedPin) {
    return (
      <div className="min-h-screen bg-gray-50 font-inter">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <Logo />
            <p className="mt-4 text-lg text-gray-600">
              Location not found. Please check the link and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 font-inter">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <Logo />
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-addypin-cyan"></div>
            </div>
            <p className="mt-4 text-lg text-gray-600">Loading location...</p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-semibold text-addypin-dark mt-4">
            Location: {typedPin.shortcode}
          </h1>
          <p className="text-addypin-medium mt-2">
            {typedPin.latitude}, {typedPin.longitude}
          </p>
        </div>

        {/* Static Map Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <div className="w-full h-64 bg-addypin-light rounded-xl flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-addypin-cyan rounded-full border-4 border-white shadow-lg transform rotate-45 relative mx-auto mb-4">
                  <div className="w-8 h-8 bg-white rounded-full absolute top-2 left-2 transform -rotate-45"></div>
                </div>
                <p className="text-addypin-dark font-medium">Pin Location</p>
                <p className="text-addypin-medium text-sm">
                  {typedPin.latitude}, {typedPin.longitude}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Apps Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-addypin-dark mb-6 text-center flex items-center justify-center">
            <i className="fas fa-external-link-alt text-addypin-cyan mr-3"></i>
            Open in Map Apps ({mapApps.length} available)
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mapApps.map((app) => (
              <Button
                key={app.name}
                asChild
                variant="outline"
                className="h-16 flex flex-col items-center justify-center p-4 hover:bg-addypin-cyan hover:text-white hover:border-addypin-cyan transition-all duration-200 group"
                data-testid={`link-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <a
                  href={typedMapLinks?.[app.name] || `https://www.google.com/maps/search/?api=1&query=${typedPin.latitude},${typedPin.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full flex flex-col items-center justify-center"
                  onClick={() => {
                    // Track which map app was clicked
                    fetch('/api/map-app-click', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pinId: typedPin.id,
                        appName: app.name
                      })
                    }).catch(console.error);
                  }}
                >
                  <i className={`${app.icon} text-lg mb-1 group-hover:scale-110 transition-transform`}></i>
                  <span className="text-xs font-medium text-center leading-tight">{app.name}</span>
                </a>
              </Button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-addypin-medium text-sm">
            Powered by <span className="text-addypin-cyan font-medium">AddyPin</span> - The simplest way to share locations
          </p>
        </div>
      </div>
    </div>
  );
}
