import { useQuery } from '@tanstack/react-query';
import type { ContractMetrics } from '@/types/blockchain';

async function fetchContractMetrics(): Promise<ContractMetrics> {
  const response = await fetch('/api/vibestr/contract-metrics');

  if (!response.ok) {
    throw new Error('Failed to fetch contract metrics');
  }

  return response.json();
}

export function useContractMetrics() {
  return useQuery({
    queryKey: ['vibestr-contract-metrics'],
    queryFn: fetchContractMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
