import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Mail, KeyRound } from "lucide-react";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditModal({ isOpen, onClose }: EditModalProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [editToken, setEditToken] = useState("");
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/otp/send", { email });
      return response.json();
    },
    onSuccess: () => {
      setShowOtpInput(true);
      toast({
        title: "Code Sent! 📧",
        description: "Check the console logs for your verification code",
      });
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

  const handleClose = () => {
    setEmail("");
    setOtpCode("");
    setShowOtpInput(false);
    setEditToken("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="w-5 h-5 text-addypin-cyan mr-2" />
            Log in
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
                  className="border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan placeholder:text-gray-400"
                  data-testid="input-edit-email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send you a 6-digit verification code (check console logs in development)
                </p>
              </div>

              {!showOtpInput ? (
                <Button
                  onClick={() => sendOtpMutation.mutate(email)}
                  disabled={!email || sendOtpMutation.isPending}
                  className="w-full bg-addypin-cyan hover:bg-cyan-600 text-white"
                  data-testid="button-send-otp"
                >
                  <Mail className="w-4 h-4 mr-2" />
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
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                      className="text-center tracking-widest text-lg border-gray-300 focus:border-addypin-cyan focus:ring-addypin-cyan"
                      data-testid="input-otp-code"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => verifyOtpMutation.mutate(otpCode)}
                      disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                      className="flex-1 bg-addypin-cyan hover:bg-cyan-600 text-white"
                      data-testid="button-verify-otp"
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
                    </Button>
                    
                    <Button
                      onClick={() => setShowOtpInput(false)}
                      variant="outline"
                      className="border-gray-300"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-lg font-semibold">✓ Authentication Successful</div>
              <p className="text-addypin-medium">
                You can now edit coordinates by entering a shortcode and new coordinates.
              </p>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>How to edit:</strong><br />
                1. Visit any pin redirect page (e.g., ABC123.addypin.com)<br />
                2. Use the edit form that appears<br />
                3. Your authentication will be valid for 1 hour
              </div>
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}