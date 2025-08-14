import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
