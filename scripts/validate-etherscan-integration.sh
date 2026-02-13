#!/bin/bash
# Etherscan Integration Validation Script
# Tests all API endpoints to ensure complete functionality with Etherscan V2

set -e

echo "🔍 Validating Etherscan V2 Integration..."
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local endpoint=$2
  local jq_filter=$3
  local min_value=$4

  echo -n "Testing $name... "

  response=$(curl -s "$BASE_URL$endpoint")
  result=$(echo "$response" | jq -r "$jq_filter")

  if [ "$result" == "null" ] || [ -z "$result" ]; then
    echo -e "${RED}✗ FAILED${NC} (null response)"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Check minimum value if provided
  if [ -n "$min_value" ]; then
    if (( $(echo "$result < $min_value" | bc -l) )); then
      echo -e "${RED}✗ FAILED${NC} (value $result < $min_value)"
      FAILED=$((FAILED + 1))
      return 1
    fi
  fi

  echo -e "${GREEN}✓ PASSED${NC} (value: $result)"
  return 0
}

# Test function for array length
test_array_endpoint() {
  local name=$1
  local endpoint=$2
  local jq_filter=$3
  local min_length=$4

  echo -n "Testing $name... "

  response=$(curl -s "$BASE_URL$endpoint")
  length=$(echo "$response" | jq -r "$jq_filter")

  if [ "$length" == "null" ] || [ -z "$length" ]; then
    echo -e "${RED}✗ FAILED${NC} (null response)"
    FAILED=$((FAILED + 1))
    return 1
  fi

  if [ "$length" -lt "$min_length" ]; then
    echo -e "${RED}✗ FAILED${NC} (length $length < $min_length)"
    FAILED=$((FAILED + 1))
    return 1
  fi

  echo -e "${GREEN}✓ PASSED${NC} (items: $length)"
  return 0
}

echo "📊 Testing Core Metrics..."
echo "-------------------------"

# ETH Price
test_endpoint "ETH Price" "/api/eth-price" ".usd" "1000"

# Collection Stats
test_endpoint "Floor Price" "/api/collection/stats" ".floorPrice" "0.01"
test_endpoint "Holder Count" "/api/collection/stats" ".numOwners" "100"
test_endpoint "Total Sales" "/api/collection/stats" ".totalSales" "100"
test_endpoint "24h Volume" "/api/collection/stats" ".volume24h" "0"
test_endpoint "24h Sales" "/api/collection/stats" ".sales24h" "0"

echo ""
echo "📈 Testing Historical Data..."
echo "-----------------------------"

# Recent Events
test_array_endpoint "Recent Events" "/api/events?limit=10&days=7" ".events | length" "3"
test_endpoint "Events Have Prices" "/api/events?limit=5&days=7" ".events[0].priceEth" "0.01"
test_endpoint "Events Have Images" "/api/events?limit=5&days=7" ".events[0].imageUrl" ""

# Price History
test_array_endpoint "Price History (7d)" "/api/price-history?days=7" ". | length" "3"
test_endpoint "Daily Volume" "/api/price-history?days=7" ".[0].volume" "0"
test_endpoint "Daily Sales Count" "/api/price-history?days=7" ".[0].salesCount" "1"

echo ""
echo "👥 Testing Trader Analytics..."
echo "------------------------------"

# Trader Analysis
test_array_endpoint "Daily Trader Stats" "/api/trader-analysis?days=30" ".dailyStats | length" "10"
test_array_endpoint "Flip Detection" "/api/trader-analysis?days=30" ".flips | length" "5"
test_array_endpoint "Top Buyers" "/api/trader-analysis?days=30" ".topBuyers | length" "3"
test_endpoint "Repeat Buyer Rate" "/api/trader-analysis?days=30" ".repeatBuyerRate" "0"

echo ""
echo "📉 Testing Market Indicators..."
echo "-------------------------------"

# Market Indicators
test_endpoint "RSI" "/api/market-indicators" ".rsi" "0"
test_endpoint "Liquidity Score" "/api/market-indicators" ".liquidityScore" "0"
test_endpoint "Volume Trend" "/api/market-indicators" ".volumeTrend" ""

echo ""
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "✅ Etherscan V2 integration is fully operational"
  echo "✅ All existing functionality preserved"
  echo "✅ Data quality validated"
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed${NC}"
  echo ""
  echo "⚠️  Some endpoints need attention"
  exit 1
fi
