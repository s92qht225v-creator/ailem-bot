#!/bin/bash
# Deployment script for DigitalOcean VPS

echo "🚀 Deploying Click Proxy to DigitalOcean..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create app directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/click-proxy
sudo chown -R $USER:$USER /var/www/click-proxy

# Copy files (run this from your local machine, not on VPS)
# scp -r click-proxy/* root@YOUR_VPS_IP:/var/www/click-proxy/

echo "📦 Installing dependencies..."
cd /var/www/click-proxy
npm install --production

# Setup environment variables
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=
VERCEL_API_URL=https://www.ailem.uz/api/click-webhook
PORT=3000
EOF
    echo "⚠️  Please edit /var/www/click-proxy/.env and add your Click credentials"
fi

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start server.js --name click-proxy
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit /var/www/click-proxy/.env with your Click credentials"
echo "2. Run: pm2 restart click-proxy"
echo "3. Get your VPS IP: curl ifconfig.me"
echo "4. Test: curl http://YOUR_IP:3000/health"
echo "5. Whitelist your IP in Click merchant cabinet"
echo ""
echo "📊 Useful commands:"
echo "  pm2 logs click-proxy    - View logs"
echo "  pm2 restart click-proxy - Restart server"
echo "  pm2 status              - Check status"
