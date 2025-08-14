import { Button } from "@/components/ui/button";
import { Lock, Unlock, LogOut, User } from "lucide-react";
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { useAuth } from "@/hooks/useAuth";

export default function AuthHeader() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
        <div className="animate-pulse text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <div className="flex items-center text-green-700">
          <Unlock className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Authenticated as {auth.email}</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
          data-testid="button-login"
        >
          <Lock className="w-4 h-4 mr-2" />
          Login to Create & Edit Pins
        </Button>
      </SignInButton>
    </div>
  );
}