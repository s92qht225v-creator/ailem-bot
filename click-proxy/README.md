# Click Payment Proxy Server

Simple proxy server for Click.uz payment gateway to work with Vercel serverless backend.

## Why This Exists

Click.uz requires static IP whitelisting, but Vercel uses dynamic IPs. This proxy:
- Runs on DigitalOcean with static IP
- Receives Click webhooks
- Forwards to Vercel API
- Handles signature verification

## Setup on DigitalOcean

### 1. Create Droplet
1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Create Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic $6/month (1GB RAM)
   - **Datacenter**: Singapore or Frankfurt (closest to Uzbekistan)
   - **Authentication**: SSH keys (recommended) or password

### 2. Connect to VPS
```bash
ssh root@YOUR_DROPLET_IP
```

### 3. Deploy Application

From your **local machine**, upload files:
```bash
# From ailem-bot directory
scp -r click-proxy/* root@YOUR_DROPLET_IP:/root/
```

On the **VPS**, run deployment script:
```bash
cd /root
chmod +x deploy.sh
./deploy.sh
```

### 4. Configure Environment
```bash
nano /var/www/click-proxy/.env
```

Add your Click credentials:
```env
CLICK_SERVICE_ID=12345
CLICK_SECRET_KEY=your_secret_key_from_click
VERCEL_API_URL=https://www.ailem.uz/api/click-webhook
PORT=3000
```

Save (Ctrl+O, Enter, Ctrl+X), then restart:
```bash
pm2 restart click-proxy
```

### 5. Get Your Static IP
```bash
curl ifconfig.me
```

### 6. Test the Server
```bash
curl http://YOUR_IP:3000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "config": {
    "service_id": "12345",
    "vercel_url": "https://www.ailem.uz/api/click-webhook"
  }
}
```

### 7. Configure Click Merchant Cabinet
1. Login to Click merchant cabinet
2. Go to Settings → API Settings
3. Add webhook URLs:
   - **Prepare URL**: `http://YOUR_IP:3000/click/prepare`
   - **Complete URL**: `http://YOUR_IP:3000/click/complete`
4. Whitelist your VPS IP address
5. Save settings

## Management Commands

```bash
# View logs
pm2 logs click-proxy

# Restart server
pm2 restart click-proxy

# Stop server
pm2 stop click-proxy

# Check status
pm2 status

# View real-time logs
pm2 logs click-proxy --lines 100
```

## Architecture

```
User Payment
    ↓
Click.uz Gateway
    ↓
VPS Proxy (Static IP) ← You whitelist this IP
    ↓
Vercel API (/api/click-webhook)
    ↓
Supabase (Update Order)
```

## Security Notes

- ✅ Signature verification implemented (MD5 hash)
- ✅ Firewall configured (UFW)
- ✅ Only ports 22 (SSH) and 3000 (API) open
- ⚠️ Consider adding HTTPS with Let's Encrypt (optional)

## Troubleshooting

### Server not responding
```bash
pm2 logs click-proxy  # Check for errors
pm2 restart click-proxy
```

### Can't connect from Click
```bash
# Check firewall
sudo ufw status

# Ensure port 3000 is open
sudo ufw allow 3000/tcp
```

### Wrong IP whitelisted
```bash
# Get your current IP
curl ifconfig.me

# Update in Click merchant cabinet
```

## Cost
- DigitalOcean Droplet: **$6/month**
- Bandwidth: Included (1TB)
- Total: **$6/month**

## Monitoring

Set up monitoring in DigitalOcean:
1. Droplet → Monitoring tab
2. Enable alerts for:
   - CPU usage > 80%
   - Disk usage > 80%
   - Memory usage > 80%

## Updates

To update the proxy code:
```bash
# On local machine
scp -r click-proxy/server.js root@YOUR_IP:/var/www/click-proxy/

# On VPS
pm2 restart click-proxy
```
