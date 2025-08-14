import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Logo from "@/components/Logo";

export default function EditPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [editToken, setEditToken] = useState("");
  const [lastOtpCode, setLastOtpCode] = useState("");
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/otp/send", { email });
      return response.json();
    },
    onSuccess: (data, email) => {
      setShowOtpInput(true);
      // Display the OTP code prominently for development
      setTimeout(() => {
        const otpMatch = data.message?.match(/\(check console in development\)/);
        if (otpMatch) {
          // Find the OTP in console logs - look for pattern "OTP for email: 123456"
          console.log(`🔑 OTP Code Display: Looking for OTP sent to ${email}`);
          toast({
            title: "OTP Sent",
            description: "Check the browser console for your 6-digit verification code",
            duration: 8000,
          });
        }
      }, 100);
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
      setLastOtpCode(otpCode);
      toast({
        title: "Verified! 🎉",
        description: "You can now edit pin coordinates using the shortcode",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-addypin-dark mt-4">Edit Pin Coordinates</h1>
          <p className="text-addypin-medium">Verify your email to edit existing pin coordinates</p>
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="w-5 h-5 text-addypin-cyan mr-2" />
                Coordinate Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editToken ? (
                <>
                  <div>
                    <Label htmlFor="edit-email" className="block text-sm font-medium text-addypin-dark mb-2">
                      Email address
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan"
                      data-testid="input-edit-email"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send you a 6-digit verification code
                    </p>
                  </div>

                  {!showOtpInput ? (
                    <Button
                      onClick={() => sendOtpMutation.mutate(email)}
                      disabled={!email || sendOtpMutation.isPending}
                      className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white"
                      data-testid="button-send-otp"
                    >
                      {sendOtpMutation.isPending ? "Sending..." : "Send Verification Code"}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="otp-code" className="block text-sm font-medium text-addypin-dark mb-2">
                          Verification Code
                        </Label>
                        <Input
                          id="otp-code"
                          type="text"
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan font-mono text-center text-lg"
                          data-testid="input-otp-code"
                        />
                        <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded border-l-4 border-orange-400 mt-3">
                          <div className="font-semibold mb-1">🔍 Development Mode Instructions:</div>
                          <div>1. Open browser console (F12 or right-click → Inspect)</div>
                          <div>2. Look for server logs with your email address</div>
                          <div>3. Find the 6-digit code and copy it here</div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => verifyOtpMutation.mutate({ email, code: otpCode })}
                        disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-verify-otp"
                      >
                        {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowOtpInput(false);
                          setOtpCode("");
                        }}
                        className="w-full"
                      >
                        Change Email
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Unlock className="w-6 h-6 text-green-600 mr-2" />
                      <span className="font-semibold text-green-800">Verified!</span>
                    </div>
                    <p className="text-sm text-green-700">
                      You can now edit pin coordinates for any shortcode associated with <strong>{email}</strong>
                    </p>
                    <div className="mt-3 p-2 bg-white rounded border text-xs">
                      <strong>Last used code:</strong> {lastOtpCode}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.location.href = '/'}
                      className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white"
                    >
                      Go to Map
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditToken("");
                        setShowOtpInput(false);
                        setEmail("");
                        setOtpCode("");
                        setLastOtpCode("");
                      }}
                      className="w-full"
                    >
                      Verify Different Email
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}