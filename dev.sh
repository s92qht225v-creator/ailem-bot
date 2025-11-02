#!/bin/bash

# Development workflow script for ailem-bot
# Use this instead of npm run dev

echo "🔨 Building production version..."
npm run build

echo ""
echo "🚀 Starting preview server..."
echo "📱 Open http://localhost:4173 in your browser"
echo ""
npm run preview
