#!/bin/bash

# DigitalOcean Deployment Script for Ailem Bot
# This script builds and deploys the app to your DO droplet

set -e  # Exit on any error

echo "🚀 Starting deployment to DigitalOcean..."

# Build the app
echo "📦 Building the app..."
npm run build

echo "✅ Build complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create a DigitalOcean Droplet (Ubuntu 22.04)"
echo "2. SSH into your droplet: ssh root@YOUR_DROPLET_IP"
echo "3. Run the setup script (see DEPLOY.md)"
echo "4. Upload the dist/ folder to your droplet"
echo ""
echo "💡 The built files are in the dist/ directory"
