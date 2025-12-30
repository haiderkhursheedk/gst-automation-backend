#!/bin/bash
# Bash script to test the GST verification service (Linux/Mac)
# Usage: ./test-service.sh [GSTIN]

GSTIN=${1:-"27ABCDE1234F1Z5"}
API_URL="http://localhost:3000/verify"

echo ""
echo "Testing GST Verification Service"
echo "GSTIN: $GSTIN"
echo ""

response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"gstin\": \"$GSTIN\"}")

if [ $? -eq 0 ]; then
  echo "✅ Verification successful!"
  echo ""
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
  echo "❌ Request failed!"
  echo "Make sure the server is running on http://localhost:3000"
fi

