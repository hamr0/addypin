// Simplified auth hook - authentication disabled for open access
export function useAuth() {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    email: null,
    logout: () => {},
  };
}