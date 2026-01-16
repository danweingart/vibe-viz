import { useQuery } from '@tanstack/react-query';
import type { NFTHistory, NFTHistorySummary, NFTStatus } from '@/types/blockchain';

interface NFTHistoryResponse {
  history: NFTHistory[];
  summary: NFTHistorySummary;
  count: number;
}

async function fetchNFTHistory(status?: NFTStatus | 'all'): Promise<NFTHistoryResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const response = await fetch(`/api/vibestr/nft-history?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch NFT history');
  }

  return response.json();
}

export function useNFTHistory(status?: NFTStatus | 'all') {
  return useQuery({
    queryKey: ['vibestr-nft-history', status || 'all'],
    queryFn: () => fetchNFTHistory(status),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
