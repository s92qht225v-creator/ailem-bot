# 🚀 Production Deployment Guide

## Build Output

Your app has been successfully built! The production files are in the `dist/` folder.

Latest build stats:
- **HTML**: 0.55 kB (gzipped: 0.34 kB)
- **CSS**: 34.12 kB (gzipped: 6.64 kB)
- **JavaScript**: 510.09 kB (gzipped: 131.64 kB)
- **Total**: ~545 kB (~138 kB gzipped)

## ⚠️ Prerequisites Before Deployment

- ✅ **Database Migration**: Run the SQL in `add-variants-column.sql` in Supabase
- ✅ **Environment Variables**: Have your Supabase and Telegram credentials ready
- ✅ **Bot Token**: Get from @BotFather on Telegram
- ✅ **Admin Telegram ID**: Your personal Telegram user ID

## Deployment Options

### 1. Vercel (Recommended)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Deploy**
```bash
vercel
```

Follow the prompts and your app will be deployed!

**Configuration**: Create `vercel.json` in your root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### 2. Netlify

**Option A: Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option B: Drag & Drop**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag the `dist` folder to the deploy area

**Configuration**: Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. GitHub Pages

**Step 1: Update `vite.config.js`**
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/', // Add this line
  server: {
    port: 3000,
    open: true
  }
})
```

**Step 2: Add to `package.json`**
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

**Step 3: Install gh-pages**
```bash
npm install --save-dev gh-pages
```

**Step 4: Deploy**
```bash
npm run deploy
```

### 4. Firebase Hosting

**Step 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

**Step 2: Initialize**
```bash
firebase login
firebase init hosting
```

Select:
- Public directory: `dist`
- Single-page app: `Yes`
- Automatic builds: `No`

**Step 3: Deploy**
```bash
npm run build
firebase deploy
```

### 5. Cloudflare Pages

**Option A: CLI**
```bash
npm install -g wrangler
wrangler pages publish dist
```

**Option B: Git Integration**
1. Push code to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
3. Pages → Create a project
4. Connect your repository
5. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`

### 6. Railway

**Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

**Step 2: Deploy**
```bash
railway login
railway init
railway up
```

### 7. Render

**Step 1: Create `render.yaml`**
```yaml
services:
  - type: web
    name: ailem-bot
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
```

**Step 2: Deploy**
1. Go to [render.com](https://render.com)
2. New → Static Site
3. Connect repository
4. Deploy

## Telegram Mini App Setup

### Step 1: Create Bot
1. Open Telegram and message [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow instructions to create your bot
4. Save the bot token

### Step 2: Configure Mini App
1. Message BotFather: `/newapp`
2. Select your bot
3. Provide:
   - Title: "Ailem Store"
   - Description: "Home Textiles Store"
   - Photo: Upload app icon (512x512px)
   - GIF: Optional demo
   - **Web App URL**: Your deployed URL (e.g., `https://your-app.vercel.app`)

### Step 3: Test
1. Open your bot in Telegram
2. Click the menu button or use keyboard button
3. Your app should open inside Telegram

### Step 4: Add to Bot Menu
```bash
# Message @BotFather
/mybots → Select your bot → Bot Settings → Menu Button → Edit menu button URL
```

Enter your deployed URL.

## 🔑 Environment Variables

**Required for production:**

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `VITE_TELEGRAM_BOT_TOKEN` | Telegram bot token | @BotFather → Your bot token |
| `VITE_ADMIN_TELEGRAM_ID` | Your Telegram user ID | Message @userinfobot on Telegram |

**How to add them:**
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **GitHub Pages**: Not supported (use public keys only)
- **Others**: Check platform-specific documentation

**Example `.env.production`:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_ADMIN_TELEGRAM_ID=123456789
```

## ✅ Post-Deployment Checklist

### **Critical Tests:**
- [ ] Test all pages load correctly
- [ ] Test product browsing and search
- [ ] Test **variant selection** (color + size combinations)
- [ ] Test cart functionality with variants
- [ ] Test checkout flow with bonus points
- [ ] Test order placement
- [ ] Test **admin panel access** (use your Telegram ID)
- [ ] Test **variant stock management** in admin
- [ ] Test **order approval** (verify variant stock deduction)
- [ ] Verify Telegram notifications work
- [ ] Test **low stock alerts** for variants

### **Platform Tests:**
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test in Telegram app
- [ ] Test on different browsers
- [ ] Verify images load correctly
- [ ] Test payment methods

### **Optional Enhancements:**
- [ ] Configure custom domain
- [ ] Set up analytics (Google Analytics, Plausible)
- [ ] Set up error tracking (Sentry)
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Add monitoring (UptimeRobot)

## Custom Domain

### Vercel
```bash
vercel domains add yourdomain.com
```

### Netlify
1. Domain settings → Add custom domain
2. Follow DNS configuration instructions

### Cloudflare Pages
1. Custom domains → Set up a custom domain
2. Add DNS records

## Performance Optimization

### After Deployment
1. **Enable Compression**: Most platforms enable gzip/brotli automatically
2. **Add CDN**: Cloudflare, AWS CloudFront
3. **Image Optimization**:
   - Use WebP format
   - Implement responsive images
   - Use a CDN like Cloudinary
4. **Code Splitting**: Already configured with Vite
5. **Caching**: Configure cache headers

### Lighthouse Score Tips
- Enable HTTPS (automatic on most platforms)
- Optimize images (use WebP)
- Minimize JavaScript
- Use lazy loading (already implemented)
- Add meta tags for SEO

## Monitoring

### Recommended Tools
- **Analytics**: Google Analytics, Plausible
- **Error Tracking**: Sentry, LogRocket
- **Performance**: Vercel Analytics, Lighthouse CI
- **Uptime**: UptimeRobot, Better Uptime

### Add Sentry (Example)
```bash
npm install @sentry/react @sentry/vite-plugin
```

Update `main.jsx`:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## Troubleshooting

### Build Fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm cache clean --force`
- Check Node version: `node --version` (use v18+)

### Images Not Loading
- Check CORS headers
- Verify image URLs are accessible
- Use relative paths for local images

### Blank Page After Deploy
- Check browser console for errors
- Verify `base` path in `vite.config.js`
- Check build output in `dist/`

### Telegram Integration Issues
- Verify Web App URL is HTTPS
- Check Telegram script loads correctly
- Test outside Telegram first

## Security

### Before Production
- [ ] Remove dev admin toggle button
- [ ] Implement proper authentication
- [ ] Validate all inputs server-side
- [ ] Use environment variables for secrets
- [ ] Enable CORS properly
- [ ] Sanitize user-generated content
- [ ] Implement rate limiting
- [ ] Use HTTPS everywhere

## Maintenance

### Regular Tasks
- Update dependencies: `npm update`
- Security audit: `npm audit`
- Monitor error logs
- Backup data regularly
- Test new features in staging first

## Support

Need help deploying? Check:
- [Vite Deployment Docs](https://vitejs.dev/guide/static-deploy.html)
- [Telegram Bot API Docs](https://core.telegram.org/bots/webapps)
- Platform-specific documentation

---

Your app is ready to deploy! 🚀

Choose a platform above and follow the steps. Most platforms offer free tiers perfect for getting started.
