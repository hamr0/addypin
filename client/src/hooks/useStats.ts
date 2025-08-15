import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 2000, // Refresh every 2 seconds for faster updates
    staleTime: 0, // Always consider data stale to force refresh
  });
}
