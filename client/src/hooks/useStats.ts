import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 5000, // Refresh every 5 seconds for faster updates
    staleTime: 0, // Always consider data stale to force refresh
  });
}
