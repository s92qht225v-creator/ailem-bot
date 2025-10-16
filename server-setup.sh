#!/bin/bash

# DigitalOcean Server Setup Script
# Run this on your droplet: bash server-setup.sh

set -e

echo "🚀 Setting up Ailem Bot server on DigitalOcean..."
echo ""

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install nginx
echo "🔧 Installing nginx..."
apt install nginx -y

# Create web directory
echo "📁 Creating web directory..."
mkdir -p /var/www/ailem-bot/dist

# Set permissions
chown -R www-data:www-data /var/www/ailem-bot
chmod -R 755 /var/www/ailem-bot

# Create nginx config
echo "⚙️  Configuring nginx..."
cat > /etc/nginx/sites-available/ailem-bot << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /var/www/ailem-bot/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable ailem-bot site
ln -sf /etc/nginx/sites-available/ailem-bot /etc/nginx/sites-enabled/

# Test nginx config
echo "🧪 Testing nginx configuration..."
nginx -t

# Restart nginx
echo "🔄 Starting nginx..."
systemctl restart nginx
systemctl enable nginx

# Configure firewall
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

echo ""
echo "✅ Server setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Upload your dist/ files to /var/www/ailem-bot/dist/"
echo "2. Visit http://139.59.254.0 to see your app"
echo ""
echo "📤 To upload files from your local machine, run:"
echo "   scp -r dist/* root@139.59.254.0:/var/www/ailem-bot/dist/"
echo ""
