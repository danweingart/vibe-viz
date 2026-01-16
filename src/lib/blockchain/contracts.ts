import type { Address } from 'viem';
import { CONTRACT_ADDRESS, VIBESTR_TOKEN_CONTRACT } from '@/lib/constants';

/**
 * Contract addresses
 */
export const CONTRACTS = {
  GVC_NFT: CONTRACT_ADDRESS as Address,
  VIBESTR_TOKEN: VIBESTR_TOKEN_CONTRACT as Address,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000' as Address,
} as const;

/**
 * ERC721 Transfer event ABI
 * Event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
 */
export const ERC721_TRANSFER_EVENT = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { type: 'address', indexed: true, name: 'from' },
    { type: 'address', indexed: true, name: 'to' },
    { type: 'uint256', indexed: true, name: 'tokenId' },
  ],
} as const;

/**
 * ERC20 Transfer event ABI
 * Event Transfer(address indexed from, address indexed to, uint256 value)
 */
export const ERC20_TRANSFER_EVENT = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { type: 'address', indexed: true, name: 'from' },
    { type: 'address', indexed: true, name: 'to' },
    { type: 'uint256', indexed: false, name: 'value' },
  ],
} as const;

/**
 * ERC721 balanceOf function ABI
 */
export const ERC721_BALANCE_OF = {
  type: 'function',
  name: 'balanceOf',
  stateMutability: 'view',
  inputs: [{ name: 'owner', type: 'address' }],
  outputs: [{ type: 'uint256' }],
} as const;

/**
 * ERC721 ownerOf function ABI
 */
export const ERC721_OWNER_OF = {
  type: 'function',
  name: 'ownerOf',
  stateMutability: 'view',
  inputs: [{ name: 'tokenId', type: 'uint256' }],
  outputs: [{ type: 'address' }],
} as const;

/**
 * Minimal ERC721 ABI (just what we need)
 */
export const ERC721_ABI = [
  ERC721_TRANSFER_EVENT,
  ERC721_BALANCE_OF,
  ERC721_OWNER_OF,
] as const;

/**
 * Minimal ERC20 ABI (just what we need)
 */
export const ERC20_ABI = [
  ERC20_TRANSFER_EVENT,
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Transfer event signature hash
 * keccak256("Transfer(address,address,uint256)")
 */
export const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Helper to check if an address is the zero address
 */
export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === CONTRACTS.ZERO_ADDRESS.toLowerCase();
}

/**
 * Helper to check if an address is the VIBESTR contract
 */
export function isVibestrContract(address: string): boolean {
  return address.toLowerCase() === CONTRACTS.VIBESTR_TOKEN.toLowerCase();
}

/**
 * Helper to check if an address is the GVC NFT contract
 */
export function isGVCContract(address: string): boolean {
  return address.toLowerCase() === CONTRACTS.GVC_NFT.toLowerCase();
}
