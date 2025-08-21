import { useQuery } from "@tanstack/react-query";

export function useStats() {
  return useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 3600000, // Refresh every 60 minutes (1 hour) - stats can wait
    staleTime: 1800000, // Consider data fresh for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: true, // Only refetch on initial mount
  });
}
