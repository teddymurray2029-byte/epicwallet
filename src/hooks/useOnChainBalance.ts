import { useReadContract, useChainId } from 'wagmi';
import { CARE_COIN_ABI, CONTRACT_ADDRESSES } from '@/lib/wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';

export function useOnChainBalance(address: string | undefined) {
  const chainId = useChainId();
  
  // Get the correct contract address for current chain
  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.careCoin;
  
  // Check if contract is deployed (not zero address)
  const isContractDeployed = contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CARE_COIN_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { 
      enabled: !!address && isContractDeployed,
    }
  });

  // Convert from wei (18 decimals) to CARE tokens
  const onChainBalance = data ? Number(data) / 1e18 : 0;

  return { 
    onChainBalance,
    isLoading: isContractDeployed ? isLoading : false,
    error,
    refetch,
    isContractDeployed,
    contractAddress,
    chainId,
    chainName: chainId === polygon.id ? 'Polygon' : chainId === polygonAmoy.id ? 'Amoy Testnet' : 'Unknown',
  };
}
