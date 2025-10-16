#!/bin/bash

# Kill all existing processes
echo "🧹 Cleaning up old processes..."
pkill -9 -f "vite|node|npm|ngrok" 2>/dev/null
sleep 2

# Start the preview server
echo "🚀 Starting preview server on port 4173..."
npm run preview &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Start ngrok
echo "🌐 Starting ngrok tunnel..."
ngrok http 4173 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

sleep 3

# Get ngrok URL
echo ""
echo "✅ Server started successfully!"
echo ""
echo "📍 Local URL: http://localhost:4173"
echo ""
echo "🌐 Ngrok URL:"
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4
echo ""
echo ""
echo "📝 Process IDs:"
echo "   Server PID: $SERVER_PID"
echo "   Ngrok PID: $NGROK_PID"
echo ""
echo "🛑 To stop: kill $SERVER_PID $NGROK_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
