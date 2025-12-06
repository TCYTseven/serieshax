#!/bin/bash
# Kill all node/ts-node processes

echo "🔍 Finding all node processes..."
ps aux | grep -E "node|ts-node" | grep -v grep

echo ""
echo "💀 Killing all node processes..."
killall -9 node 2>/dev/null
pkill -9 -f "ts-node" 2>/dev/null
pkill -9 -f "index.ts" 2>/dev/null
pkill -9 -f "index-robust.ts" 2>/dev/null

echo ""
echo "✅ Checking if any are still running..."
sleep 1
REMAINING=$(ps aux | grep -E "node|ts-node" | grep -v grep | wc -l)
if [ "$REMAINING" -eq 0 ]; then
  echo "✅ All processes killed!"
else
  echo "⚠️  Some processes still running:"
  ps aux | grep -E "node|ts-node" | grep -v grep
fi
