import { useUser, useClerk } from '@clerk/clerk-react';

export function useAuth() {
  try {
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
  } catch (error) {
    // If Clerk is not available, return default values
    console.warn('Clerk not available, using fallback auth state:', error);
    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      userId: null,
      email: null,
      logout: () => console.warn('Authentication not available'),
    };
  }
}