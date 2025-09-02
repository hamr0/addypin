import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Lock, Unlock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Logo from "@/components/Logo";
import MapSection from "@/components/MapSection";
import { getCountryFromCoords } from "@shared/utils";

interface Pin {
  id: string;
  shortcode: string;
  latitude: string;
  longitude: string;
  createdAt: string;
  userEmail?: string;
  isActive: boolean;
  createdBy?: string;
  expiresAt?: string;
}

interface MapLinks {
  [key: string]: string;
}

export default function RedirectPage() {
  const [, params] = useRoute("/redirect/:shortcode");
  const shortcode = params?.shortcode;
  const [editMode, setEditMode] = useState(false);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [editToken, setEditToken] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const { data: pin, isLoading, error } = useQuery({
    queryKey: ["/api/pins", shortcode],
    enabled: !!shortcode,
  });

  const { data: mapLinks } = useQuery({
    queryKey: ["/api/map-links", (pin as Pin)?.latitude, (pin as Pin)?.longitude],
    enabled: !!pin,
  });

  const typedPin = pin as Pin;
  const typedMapLinks = mapLinks as MapLinks;

  // Set coordinates when pin is loaded
  React.useEffect(() => {
    if (typedPin) {
      setCoordinates({
        lat: parseFloat(typedPin.latitude),
        lng: parseFloat(typedPin.longitude)
      });
    }
  }, [typedPin]);

  // Update page title when pin loads
  React.useEffect(() => {
    if (typedPin) {
      const country = getCountryFromCoords(parseFloat(typedPin.latitude), parseFloat(typedPin.longitude));
      document.title = `${typedPin.shortcode} addypin - ${country}`;
    }
  }, [typedPin]);

  // OTP mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/otp/send", { email });
      return response.json();
    },
    onSuccess: () => {
      setShowOtpInput(true);
      toast({
        title: "OTP Sent",
        description: "Check your email for the verification code",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/otp/verify", { email, code });
      return response.json();
    },
    onSuccess: (data) => {
      setEditToken(data.editToken);
      setEditMode(true);
      toast({
        title: "Verified",
        description: "You can now edit pin coordinates by dragging the pin",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  const updatePinMutation = useMutation({
    mutationFn: async (newCoords: { lat: number; lng: number }) => {
      const response = await apiRequest("PUT", `/api/pins/${shortcode}`, {
        latitude: newCoords.lat,
        longitude: newCoords.lng,
        editToken,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pin Updated",
        description: "Coordinates have been updated successfully",
      });
      setEditMode(false);
      setEditToken("");
      setShowOtpInput(false);
      setOtpCode("");
      setEmail("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update pin",
        variant: "destructive",
      });
    },
  });

  const handleCoordinatesChange = (newCoords: { lat: number; lng: number }) => {
    setCoordinates(newCoords);
    if (editMode && editToken) {
      // Auto-update when in edit mode
      updatePinMutation.mutate(newCoords);
    }
  };

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
            {typedPin.shortcode} - {getCountryFromCoords(parseFloat(typedPin.latitude), parseFloat(typedPin.longitude))}
          </h1>
          <p className="text-addypin-medium mt-2">
            {typedPin.latitude}, {typedPin.longitude}
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Map Section */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-addypin-dark mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-addypin-cyan" />
                Pin Location
              </h2>
              {coordinates && (
                <div className="h-96 rounded-lg overflow-hidden">
                  <MapSection 
                    coordinates={coordinates}
                    onCoordinatesChange={handleCoordinatesChange}
                    generatedLink={null}
                    readOnly={true}
                  />
                </div>
              )}
              <p className="text-sm text-gray-600 mt-3">
                Coordinates: {typedPin.latitude}, {typedPin.longitude}
              </p>
              {typedPin.createdBy && (
                <p className="text-xs text-gray-500 mt-1">
                  Created by: {typedPin.createdBy}
                </p>
              )}
              {typedPin.expiresAt && (
                <p className="text-xs text-amber-600 mt-1">
                  Expires: {new Date(typedPin.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-6">
            {/* Edit Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-addypin-dark mb-4 flex items-center">
                <Edit className="w-5 h-5 mr-2 text-addypin-cyan" />
                Edit addypin
              </h3>

              {!editMode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Verify your email to edit this addypin's coordinates.
                  </p>
                  
                  <div>
                    <Label htmlFor="edit-email" className="block text-sm font-medium text-addypin-dark mb-2">
                      Email for verification
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="edit-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                        data-testid="input-edit-email"
                      />
                      <Button
                        onClick={() => sendOtpMutation.mutate(email)}
                        disabled={!email || sendOtpMutation.isPending}
                        className="bg-addypin-cyan hover:bg-cyan-600 text-white px-4"
                        data-testid="button-send-otp"
                      >
                        {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
                      </Button>
                    </div>
                  </div>

                  {showOtpInput && (
                    <div>
                      <Label htmlFor="otp-code" className="block text-sm font-medium text-addypin-dark mb-2">
                        Verification Code
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          id="otp-code"
                          type="text"
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                          className="flex-1 font-mono"
                          data-testid="input-otp-code"
                        />
                        <Button
                          onClick={() => verifyOtpMutation.mutate({ email, code: otpCode })}
                          disabled={!otpCode || verifyOtpMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white px-4"
                          data-testid="button-verify-otp"
                        >
                          {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center">
                    <Unlock className="w-4 h-4 mr-2" />
                    Edit mode active! Drag the pin to update coordinates.
                  </p>
                </div>
              )}
            </div>

            {/* Map Apps Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-addypin-dark mb-4">
                Choose Your Map App
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {typedMapLinks && Object.entries(typedMapLinks).map(([appName, link]) => (
                  <a
                    key={appName}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-14 flex items-center justify-start p-4 border rounded-md hover:bg-addypin-cyan hover:text-white hover:border-addypin-cyan transition-all duration-200 no-underline text-gray-700 hover:no-underline"
                    data-testid={`link-${appName.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={async (e) => {
                      // Track map app click analytics without preventing default
                      if (coordinates) {
                        // Fire and forget - don't await to avoid blocking the link
                        apiRequest("POST", "/api/analytics/map-click", {
                          appName: appName,
                          latitude: coordinates.lat,
                          longitude: coordinates.lng
                        }).catch(error => {
                          console.log("Analytics tracking failed:", error);
                        });
                      }
                    }}
                  >
                    <span className="font-medium">{appName}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
