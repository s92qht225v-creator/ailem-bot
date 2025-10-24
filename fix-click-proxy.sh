#!/bin/bash
# Quick fix script for Click proxy configuration

echo "🔧 Fixing Click Proxy Configuration"
echo "===================================="
echo ""

# Check if we can connect to the proxy server
echo "1. Checking proxy server connection..."
HEALTH=$(curl -s http://159.65.128.207:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ Proxy server is reachable"
    echo "Response: $HEALTH"
else
    echo "❌ Cannot reach proxy server at 159.65.128.207:3000"
    exit 1
fi

echo ""
echo "2. The proxy server is missing Click credentials."
echo ""
echo "To fix this, you need to:"
echo ""
echo "📋 Step 1: Get Click credentials from merchant cabinet"
echo "   - Service ID"
echo "   - Secret Key"
echo ""
echo "📋 Step 2: SSH to proxy server and configure:"
echo ""
echo "   ssh root@159.65.128.207"
echo "   nano /var/www/click-proxy/.env"
echo ""
echo "📋 Step 3: Add these lines:"
echo ""
echo "   CLICK_SERVICE_ID=your_service_id_here"
echo "   CLICK_SECRET_KEY=your_secret_key_here"
echo "   VERCEL_API_URL=https://www.ailem.uz/api/click-webhook"
echo "   PORT=3000"
echo ""
echo "📋 Step 4: Save (Ctrl+O, Enter, Ctrl+X) and restart:"
echo ""
echo "   pm2 restart click-proxy"
echo "   pm2 logs click-proxy"
echo ""
echo "===================================="
echo ""
echo "💡 Alternative: You can also run this command:"
echo ""
echo "ssh root@159.65.128.207 'cat > /var/www/click-proxy/.env << EOF
CLICK_SERVICE_ID=YOUR_SERVICE_ID
CLICK_SECRET_KEY=YOUR_SECRET_KEY
VERCEL_API_URL=https://www.ailem.uz/api/click-webhook
PORT=3000
EOF
pm2 restart click-proxy'"
echo ""
echo "===================================="
