import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, ExternalLink } from "lucide-react";
import type { Pin } from "@shared/schema";

interface PinSelectorProps {
  email: string;
  onPinSelect: (pin: Pin) => void;
  selectedPin?: Pin;
}

export function PinSelector({ email, onPinSelect, selectedPin }: PinSelectorProps) {
  const { data: userPins, isLoading } = useQuery({
    queryKey: ['/api/user/pins', email],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/pins/${email}`);
      return await response.json() as Pin[];
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading your pins...</div>;
  }

  if (!userPins || userPins.length === 0) {
    return (
      <div className="text-center py-6">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No pins found for this email address.</p>
        <p className="text-sm text-gray-500">Create some pins first to edit them.</p>
      </div>
    );
  }

  // Auto-select oldest pin if none selected
  if (!selectedPin && userPins.length > 0) {
    setTimeout(() => onPinSelect(userPins[0]), 0);
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-addypin-dark mb-3">Your Pins ({userPins.length})</h4>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {userPins.map((pin) => (
          <Card 
            key={pin.id}
            className={`cursor-pointer transition-all ${
              selectedPin?.id === pin.id 
                ? 'ring-2 ring-addypin-cyan bg-cyan-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onPinSelect(pin)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {pin.shortcode}
                    </Badge>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(pin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}