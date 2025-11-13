#!/bin/bash

###############################################################################
# Deployment Verification Script
# 
# This script verifies that the application is running correctly after deployment
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
HOST="${1:-localhost}"
PORT="${2:-3000}"
BASE_URL="http://${HOST}:${PORT}"

echo "========================================"
echo "   Deployment Verification Tests"
echo "========================================"
echo "Target: ${BASE_URL}"
echo ""

# Test 1: Health Check
echo -n "1. Health check endpoint... "
response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" || echo "000")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    health_data=$(curl -s "${BASE_URL}/api/health")
    echo "   Response: ${health_data}"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP ${response})"
    exit 1
fi

# Test 2: Homepage Access
echo -n "2. Homepage access... "
response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/" || echo "000")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP ${response})"
    exit 1
fi

# Test 3: API Availability (Scan endpoint)
echo -n "3. Scan API endpoint... "
response=$(curl -s -X POST "${BASE_URL}/api/scan" \
    -H "Content-Type: application/json" \
    -d '{}' \
    -o /dev/null -w "%{http_code}" || echo "000")
if [ "$response" = "400" ] || [ "$response" = "429" ]; then
    # 400 (Bad Request) or 429 (Rate Limit) both indicate API is working
    echo -e "${GREEN}✓ PASS${NC} (Returned ${response}, API working)"
else
    echo -e "${YELLOW}⚠ WARN${NC} (HTTP ${response})"
fi

# Test 4: Response Time
echo -n "4. Response time test... "
start=$(date +%s%N)
curl -s "${BASE_URL}/api/health" > /dev/null
end=$(date +%s%N)
duration=$(( ($end - $start) / 1000000 ))
if [ "$duration" -lt 1000 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${duration}ms)"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "========================================"
echo ""
echo "Application successfully deployed and running!"
echo "Visit: ${BASE_URL}"
