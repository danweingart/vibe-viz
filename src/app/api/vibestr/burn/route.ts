import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/blockchain/client";
import { cache } from "@/lib/cache/memory";
import { VIBESTR_TOKEN_CONTRACT } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ERC20 ABI fragments for burn tracking
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export interface BurnMetrics {
  burned: number;
  burnPercentage: number;
  totalSupply: number;
  circulatingSupply: number;
  lastUpdated: string;
}

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<BurnMetrics>("vibestr-burn-metrics");
    if (cached) {
      console.log("Returning cached burn metrics");
      return NextResponse.json(cached);
    }

    console.log("Fetching fresh burn metrics from blockchain");

    const client = getPublicClient();

    // Make 3 parallel contract calls
    const [deadBalance, totalSupply, decimals] = await Promise.all([
      client.readContract({
        address: VIBESTR_TOKEN_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [DEAD_ADDRESS as `0x${string}`],
      }),
      client.readContract({
        address: VIBESTR_TOKEN_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: VIBESTR_TOKEN_CONTRACT as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    ]);

    // Convert from wei to decimal
    const decimalsFactor = Math.pow(10, Number(decimals));
    const burned = Number(deadBalance) / decimalsFactor;
    const supply = Number(totalSupply) / decimalsFactor;

    // Calculate metrics
    const burnPercentage = (burned / supply) * 100;
    const circulatingSupply = supply - burned;

    const metrics: BurnMetrics = {
      burned,
      burnPercentage,
      totalSupply: supply,
      circulatingSupply,
      lastUpdated: new Date().toISOString(),
    };

    // Cache with 60-second TTL
    await cache.set("vibestr-burn-metrics", metrics, 60);

    console.log("Burn metrics cached successfully");

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching burn metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch burn metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
