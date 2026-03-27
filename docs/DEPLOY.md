# Deploying Ailem Bot to DigitalOcean

This guide will help you deploy your Ailem Bot to a DigitalOcean droplet.

## Prerequisites

1. A DigitalOcean account
2. A domain name (optional, but recommended)
3. Basic terminal/SSH knowledge

## Step 1: Create a DigitalOcean Droplet

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($4/month is sufficient)
   - **CPU**: Regular (1 GB RAM, 1 vCPU)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
4. Click "Create Droplet"
5. Note your droplet's IP address

## Step 2: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Initial Server Setup

Run these commands on your droplet:

```bash
# Update system
apt update && apt upgrade -y

# Install nginx
apt install nginx -y

# Install certbot for SSL (if you have a domain)
apt install certbot python3-certbot-nginx -y

# Create web directory
mkdir -p /var/www/ailem-bot

# Set permissions
chown -R www-data:www-data /var/www/ailem-bot
```

## Step 4: Configure Nginx

1. Create nginx config:

```bash
nano /etc/nginx/sites-available/ailem-bot
```

2. Copy the contents from `nginx.conf` in your project
3. Replace `YOUR_DOMAIN.com` with your actual domain (or use IP)
4. Save and exit (Ctrl+X, Y, Enter)

5. Enable the site:

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Enable ailem-bot site
ln -s /etc/nginx/sites-available/ailem-bot /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
```

## Step 5: Build and Upload Your App

### On Your Local Machine:

```bash
# Build the app
npm run build

# Upload to droplet (replace YOUR_DROPLET_IP)
scp -r dist/* root@YOUR_DROPLET_IP:/var/www/ailem-bot/dist/
```

Or use SFTP client like FileZilla:
- Host: `sftp://YOUR_DROPLET_IP`
- Username: `root`
- Upload `dist/` folder contents to `/var/www/ailem-bot/dist/`

## Step 6: Set Up SSL (If You Have a Domain)

### On Your Droplet:

```bash
# Point your domain's DNS A record to your droplet's IP first!
# Then run:

certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure SSL.

## Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

## Step 8: Test Your Deployment

Visit `http://YOUR_DROPLET_IP` or `https://yourdomain.com`

Your app should now be live!

## Updating Your App

When you make changes:

```bash
# On your local machine:
npm run build
scp -r dist/* root@YOUR_DROPLET_IP:/var/www/ailem-bot/dist/

# No need to restart nginx - static files update automatically
```

## Troubleshooting

### Check nginx status:
```bash
systemctl status nginx
```

### Check nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

### Restart nginx:
```bash
systemctl restart nginx
```

### Permissions issues:
```bash
chown -R www-data:www-data /var/www/ailem-bot
chmod -R 755 /var/www/ailem-bot
```

## Cost Estimate

- Basic Droplet: $4-6/month
- Domain (optional): $10-15/year
- SSL Certificate: Free (Let's Encrypt)

**Total: ~$4-6/month** (or ~$0.20/day)

## Performance Tips

1. Enable nginx gzip compression (already in config)
2. Use Cloudflare as CDN (free tier) in front of your droplet
3. Consider upgrading droplet if traffic increases

## Backup Strategy

```bash
# Create backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
tar -czf /root/backups/ailem-bot-$(date +%Y%m%d).tar.gz /var/www/ailem-bot
find /root/backups -name "ailem-bot-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup.sh

# Add to crontab (daily backup at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup.sh") | crontab -
```

## Need Help?

- DigitalOcean Docs: https://docs.digitalocean.com/
- Nginx Docs: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/docs/
