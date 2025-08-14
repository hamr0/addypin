import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (sessionToken: string, email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", { email });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setStep('otp');
        toast({
          title: "Code Sent",
          description: "Check your email for the 6-digit login code.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
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
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", { email, code });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.sessionToken) {
        onAuthenticated(data.sessionToken, email);
        toast({
          title: "Authentication Successful",
          description: "You can now edit coordinates.",
        });
        handleClose();
      } else {
        toast({
          title: "Invalid Code",
          description: data.message || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify code",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtpCode('');
    onClose();
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      sendOtpMutation.mutate(email);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && otpCode) {
      verifyOtpMutation.mutate({ email, code: otpCode });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-addypin-dark">
            {step === 'email' ? 'Login to Edit Coordinates' : 'Enter Verification Code'}
          </DialogTitle>
        </DialogHeader>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-addypin-dark">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                data-testid="input-auth-email"
              />
              <p className="text-xs text-addypin-medium mt-1">
                We'll send you a 6-digit code to verify your identity.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
                data-testid="button-auth-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!email || sendOtpMutation.isPending}
                className="flex-1 bg-addypin-cyan hover:bg-addypin-cyan/90 text-white"
                data-testid="button-send-code"
              >
                {sendOtpMutation.isPending ? "Sending..." : "Send Code"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label htmlFor="otpCode" className="text-addypin-dark">6-Digit Code</Label>
              <Input
                id="otpCode"
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="mt-1 text-center text-lg font-mono"
                data-testid="input-otp-code"
              />
              <p className="text-xs text-addypin-medium mt-1">
                Code sent to {email}. Check your email inbox.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('email')}
                className="flex-1"
                data-testid="button-back-to-email"
              >
                Back
              </Button>
              <Button 
                type="submit"
                disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                className="flex-1 bg-addypin-cyan hover:bg-addypin-cyan/90 text-white"
                data-testid="button-verify-code"
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}