import { useUser, useClerk } from '@clerk/clerk-react';

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return {
    isAuthenticated: !!user,
    isLoading: !isLoaded,
    user,
    userId: user?.id || null,
    email: user?.primaryEmailAddress?.emailAddress || null,
    logout: () => signOut(),
  };
}