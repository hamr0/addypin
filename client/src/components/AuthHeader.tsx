import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "./AuthModal";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AuthHeader() {
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (auth.sessionToken) {
        await apiRequest("POST", "/api/auth/logout", { sessionToken: auth.sessionToken });
      }
    },
    onSuccess: () => {
      auth.logout();
      toast({
        title: "Logged Out",
        description: "You've been successfully logged out.",
      });
    },
    onError: () => {
      // Still logout locally even if server call fails
      auth.logout();
    },
  });

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <div className="flex items-center text-green-700">
          <Unlock className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Authenticated as {auth.email}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="text-green-700 border-green-300 hover:bg-green-100"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-1" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowAuthModal(true)}
        variant="outline"
        className="border-amber-300 text-amber-700 hover:bg-amber-50"
        data-testid="button-login"
      >
        <Lock className="w-4 h-4 mr-2" />
        Login to Edit Coordinates
      </Button>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={auth.login}
      />
    </>
  );
}