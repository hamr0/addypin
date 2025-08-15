import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 60000, // Refresh every 60 seconds (much more reasonable)
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Only refetch on initial mount
  });
}
