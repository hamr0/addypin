import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Edit, Mail, KeyRound, LogOut, Trash2 } from "lucide-react";
import type { Pin } from "@shared/schema";

interface UserPinsListProps {
  onPinSelect?: (pin: Pin) => void;
  onStartEditing?: () => void;
}

export function UserPinsList({ onPinSelect, onStartEditing }: UserPinsListProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [editToken, setEditToken] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user pins after authentication
  const { data: userPins, refetch: refetchPins } = useQuery({
    queryKey: [`/api/user/pins/${email}`],
    enabled: isAuthenticated && !!email,
  });

  // Listen for pin updates to refresh the list
  useEffect(() => {
    const handlePinUpdate = () => {
      if (isAuthenticated && email) {
        refetchPins();
      }
    };

    const handlePinCreated = (event: any) => {
      if (isAuthenticated && email && event.detail?.createdBy === email) {
        refetchPins();
      }
    };

    window.addEventListener('pinUpdated', handlePinUpdate);
    window.addEventListener('pinCreated', handlePinCreated as EventListener);
    return () => {
      window.removeEventListener('pinUpdated', handlePinUpdate);
      window.removeEventListener('pinCreated', handlePinCreated as EventListener);
    };
  }, [isAuthenticated, email, refetchPins]);

  // Delete pin mutation
  const deletePinMutation = useMutation({
    mutationFn: async (shortcode: string) => {
      const response = await apiRequest("DELETE", `/api/pins/${shortcode}`, {});
      return response.json();
    },
    onSuccess: (data, shortcode) => {
      toast({
        title: "addypin deleted! 🗑️", 
        description: `addypin ${shortcode} has been permanently deleted`,
        duration: 5000,
      });
      refetchPins();
      setSelectedPin(null);
      setShowDeleteConfirm(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete addypin",
        variant: "destructive",
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/otp/send", { email });
      return response.json();
    },
    onSuccess: (data) => {
      setShowOtpInput(true);
      const otpCode = data.code;
      toast({
        title: "Code Sent! 📧",
        description: otpCode 
          ? `Development Mode: Your code is ${otpCode}`
          : "Check your email for the 6-digit verification code",
        duration: 10000,
      });
      // Log prominent instructions to help user find the OTP
      console.log(`\n🔍 ===============================`);
      console.log(`🔍 DEVELOPMENT MODE - OTP INSTRUCTIONS`);
      console.log(`🔍 Look at the Workflow Console (server logs)`);
      console.log(`🔍 Find the box with "🔑 OTP CODE FOR ${email.toUpperCase()}"`);
      console.log(`🔍 Copy the 6-digit number and paste it in the form`);
      console.log(`🔍 ===============================\n`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send code",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/otp/verify", { email, code });
      return response.json();
    },
    onSuccess: (data) => {
      setEditToken(data.editToken);
      setIsAuthenticated(true);
      setShowOtpInput(false);
      refetchPins();
      toast({
        title: "Email Verified! ✅",
        description: "Select an addypin below to start editing its coordinates",
        duration: 5000,
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

  const handlePinSelect = (pin: Pin) => {
    setSelectedPin(pin);
    if (onPinSelect) {
      onPinSelect(pin);
    }
  };

  const handleStartEditing = () => {
    if (selectedPin && onStartEditing) {
      onStartEditing();
    }
  };

  // Get country from coordinates (placeholder - would use reverse geocoding in production)
  const getCountryFromCoords = (lat: number, lng: number): string => {
    // More comprehensive mapping based on coordinate ranges
    if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) return "USA";
    if (lat >= 49 && lat <= 71 && lng >= -10 && lng <= 30) return "Netherlands"; 
    if (lat >= 20 && lat <= 40 && lng >= 25 && lng <= 40) return "Egypt";
    if (lat >= 35 && lat <= 42 && lng >= 25 && lng <= 45) return "Turkey";
    if (lat >= 45 && lat <= 55 && lng >= 2 && lng <= 8) return "France";
    if (lat >= 47 && lat <= 55 && lng >= 5 && lng <= 15) return "Germany";
    if (lat >= 50 && lat <= 60 && lng >= -8 && lng <= 2) return "United Kingdom";
    if (lat >= 30 && lat <= 37 && lng >= 66 && lng <= 78) return "Pakistan";
    return "Unknown";
  };

  if (!isAuthenticated) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 text-addypin-cyan mr-2" />
            My addypins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Login to view and edit your registered addypins
          </p>
          
          <div>
            <Label htmlFor="user-email" className="block text-sm font-medium text-addypin-dark mb-2">
              Email address
            </Label>
            <Input
              id="user-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan placeholder:text-gray-400"
              data-testid="input-user-email"
            />
          </div>

          {!showOtpInput ? (
            <Button
              onClick={() => sendOtpMutation.mutate(email)}
              disabled={!email || sendOtpMutation.isPending}
              className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white"
              data-testid="button-send-user-otp"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendOtpMutation.isPending ? "Sending..." : "Send Verification Code"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="user-otp" className="block text-sm font-medium text-addypin-dark mb-2">
                  Verification Code
                </Label>
                <Input
                  id="user-otp"
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center tracking-widest text-lg border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan placeholder:text-gray-400"
                  data-testid="input-user-otp"
                />
              </div>
              
              <Button
                onClick={() => verifyOtpMutation.mutate(otpCode)}
                disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white"
                data-testid="button-verify-user-otp"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-addypin-cyan mr-2" />
            My addypins ({(userPins as Pin[])?.length || 0})
          </div>
          <Button
            onClick={() => {
              setIsAuthenticated(false);
              setEmail("");
              setOtpCode("");
              setShowOtpInput(false);
              setSelectedPin(null);
              setEditToken("");
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Log out
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!userPins || (userPins as Pin[]).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No addypins found for this email address
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {(userPins as Pin[]).map((pin) => (
              <div
                key={pin.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedPin?.id === pin.id
                    ? 'border-addypin-cyan bg-cyan-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePinSelect(pin)}
                data-testid={`pin-item-${pin.shortcode}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-addypin-dark">
                        {pin.shortcode}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getCountryFromCoords(Number(pin.latitude), Number(pin.longitude))}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono">
                      📍 {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      📅 {new Date(pin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="ml-3 flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPin(pin);
                        handleStartEditing();
                      }}
                      size="sm"
                      variant="outline"
                      className="p-2"
                      data-testid={`button-edit-pin-${pin.shortcode}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(pin.shortcode);
                      }}
                      size="sm"
                      variant="outline"
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-pin-${pin.shortcode}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPin && (
          <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
            <div className="text-sm font-medium text-cyan-800 mb-1">
              Selected: {selectedPin.shortcode}
            </div>
            <div className="text-xs text-cyan-700">
              Click "Edit" to modify coordinates on the map
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete addypin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete addypin {showDeleteConfirm}? It can't be undone and {showDeleteConfirm} addypin can be reused.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showDeleteConfirm && deletePinMutation.mutate(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete addypin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}