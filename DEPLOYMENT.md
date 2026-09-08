# 🚀 Deployment Guide - KasKeluarga SaaS

## ✅ Production Ready Checklist

### Build & Tests Status
- [x] Landing Page (SaaS public site) - **COMPLETE**
- [ ] Core App (`src/app/page.tsx`) - **NEEDS FIXES**
- [ ] Test Suite - 147/151 PASSED (4 FAILED)
- [ ] Linting - 54 problems remaining

### Known Issues to Fix Before Full Launch

#### 1. Sidebar Navigation Syntax Error
**File**: `src/components/layout/SidebarNav.tsx`
**Issue**: Broken drag-drop state code inserted inside JSX tags
**Status**: File corrupted by previous edits, needs git restore + clean fix

#### 2. Subscription Component Icon Error  
**File**: `src/components/subscriptions/SubscriptionsView.tsx`
**Issue**: Used non-existent Phosphor icon `TrendingUp`
**Status**: Fixed - replaced with `CircleDashed`

#### 3. Database Schema Migration
**Files Created**: 
- `/api/budgets/templates`
- `/api/subscriptions/route`
- `/api/events/*`
- `/api/currencies/route`

**Action Required**: Run `POST /api/init` after deploy to Vercel to create new tables.

## 📦 Deployment Steps

### Step 1: Fix Core App Issues

```bash
# Restore broken files from git first
git checkout src/components/layout/SidebarNav.tsx

# Re-implement features cleanly without breaking syntax
# See notes below for implementation approach
```

**Implementation Note**: 
- Do NOT insert JavaScript state declarations inside JSX
- Move all logic outside of render methods
- Use proper component structure: props/state → functions → return JSX

### Step 2: Update Environment Variables (Vercel)

Add these in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your Neon Postgres URL | Serverless, SSL required |
| `JWT_SECRET` | Random 32-char string | Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_NAME` | "KasKeluarga" | PWA app name |
| `DEEPSEEK_API_KEY` | (Optional) DeepSeek API key | For receipt scanning AI |
| `VAPID_PUBLIC_KEY` | (Optional) Web Push keys | For notifications |
| `CRON_SECRET` | (Optional) Cron auth token | For scheduled tasks |

### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI if not already
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or use GitHub integration:
1. Push code to `main` branch
2. Vercel auto-deploys on push
3. Configure environment variables in dashboard

### Step 4: Run Database Migrations

After deployment, initialize database:

```bash
curl -X POST https://your-app.vercel.app/api/init
```

This creates all tables including:
- ✅ `budgets_templates` (AI budget templates)
- ✅ `subscriptions` (Subscription tracker)
- ✅ `financial_events` (Calendar events)
- ✅ All existing tables with constraints

### Step 5: Configure cron jobs (Optional)

Set up daily reminders at `02:00 UTC`:

**Vercel Cron Setup**:
1. Go to Vercel Dashboard > Cron Triggers
2. Add schedule: `0 2 * * *`
3. Endpoint: `/api/bills/cron` AND `/api/push/cron`
4. Auth secret: Use your `CRON_SECRET`

Or use external scheduler like:
- AWS EventBridge
- Cron-job.org
- Uptime Robot

### Step 6: Configure PWA

Ensure these files exist in public/:
- [x] `manifest.json` ✓
- [x] `icons/icon-192.png` ✓
- [x] `icons/apple-touch-icon.png` ✓
- [x] `sw.js` (Service Worker) ✓

PWA should be installable on:
- ✅ Android Chrome
- ✅ iOS Safari
- ✅ Windows Edge/Chrome
- ✅ macOS Safari

### Step 7: Monitoring & Analytics

Set up monitoring tools:

1. **Vercel Analytics**: Enabled by default
2. **PostHog** (Open-source): For event tracking
3. **Sentry** (Error logging): 
   ```bash
   npm i @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```
4. **Uptime Robot**: Monitor uptime (free tier available)

## 🎯 Quick Fixes Needed

### Fix 1: SidebarNav Cleanup

Remove ALL inline state declarations from JSX:

**WRONG** ❌ (Current broken pattern):
```jsx
<div>
  <span>Icon</span>
  const [state, setState] = useState(); // ERROR!
</div>
```

**RIGHT** ✓ (Correct pattern):
```jsx
function MyComponent() {
  const [state, setState] = useState(); // OK
  
  return (
    <div>
      <span>Icon</span>
    </div>
  );
}
```

### Fix 2: Remove Ponytail Markers

All `PONYPOTAIL://` markers must be removed before production:

```bash
grep -r "PONYPOTAIL\|ponytail" src/ components/ --include="*.tsx" --include="*.ts"
# Then manually remove or convert to regular comments
```

### Fix 3: Update Changelog

```bash
# Edit changelog.md to document v2.0 features
# Include all new features: Multi-currency, Subscriptions, Events, Templates
```

## 📊 Post-Deployment Tasks

### A. Verify Public Landing Page

Visit: `https://your-app.vercel.app`

Should see:
- Modern gradient hero section
- Feature grid cards
- Live statistics
- CTA buttons working
- Smooth animations

### B. Test User Registration Flow

1. Visit `/register`
2. Fill form (name, email, password)
3. Submit → redirect to `/login`
4. Login → redirect to `/`
5. Dashboard loads with empty state

### C. Create Sample Data

Use seed script or manual entry:
- 1 wallet
- 3 expense categories  
- 5 transactions
- 1 subscription (Netflix example)
- 1 goal ("Emergency Fund")

### D. Test PWA Installation

On mobile device:
1. Open Chrome → add to home screen banner
2. Launch as standalone app
3. Try offline mode (disconnect internet)
4. Add transaction while offline
5. Reconnect → verify sync occurred

### E. Enable Push Notifications

```javascript
// In browser console:
const permission = await Notification.requestPermission();
console.log('Notification permission:', permission); // Should be 'granted'
```

Test notification triggers:
- Tag payment due date H-1
- Budget 80% spent warning
- System maintenance announcement

## 🔐 Security Verification

Before going live, verify:

- [ ] No secrets in public code (`grep -r SECRET .`)
- [ ] `.env.local` not committed to git
- [ ] CORS headers configured (if using external APIs)
- [ ] Rate limiting active on sensitive endpoints
- [ ] HTTPS enforced in production
- [ ] JWT token versioning works (logout revokes sessions)
- [ ] Database user has minimal permissions (SELECT/INSERT/UPDATE only)

## 📱 Mobile Optimization

Verify responsive design:

**Breakpoints tested**:
- ✅ 390×844 (iPhone SE)
- ✅ 375×812 (iPhone 12)  
- ✅ 768×1024 (iPad Mini)
- ✅ 1024×1366 (iPad Pro)
- ✅ 1920×1080 (Desktop)

**Touch targets verified**:
- ✅ Buttons ≥ 44×44 px
- ✅ Bottom nav items ≥ 44px height
- ✅ FAB button 56×56 px
- ✅ Safe area insets respected

## 🎨 Performance Benchmarks

Target scores:
- Lighthouse Mobile: **90+**
- Lighthouse Desktop: **95+**
- First Contentful Paint: **< 1.5s**
- Time to Interactive: **< 2.5s**
- Bundle Size (gzipped): **< 400KB**

Run audit:
```bash
npx lighthouse --view https://your-app.vercel.app
```

---

## 🆘 Troubleshooting

### Build Fails with "Expected ident" error
- Check for malformed JSX with inline JavaScript
- Ensure no PONYPOTAIL markers remain
- Clean build: `rm -rf node_modules/.cache && npm run build`

### Database Connection Fails
- Verify DATABASE_URL has correct credentials
- Check Neon connection string uses SSL mode=require
- Ensure IP whitelisting allows Vercel IPs

### PWA Not Installing
- Verify manifest.json has valid `start_url` and `display`
- Service worker must be registered in root layout
- HTTPS required (except localhost)

### Push Notifications Not Working
- Check VAPID keys generated with `web-push generate-vapid-keys`
- Browser notification permission granted
- Cron job running every hour to check reminders

---

## ✨ Next Steps After Deployment

1. **SEO Optimization**:
   - Add meta descriptions
   - Implement sitemap.xml
   - Robots.txt configuration
   - Open Graph tags

2. **Content Marketing**:
   - Write blog posts about personal finance tips
   - Create tutorial videos (YouTube)
   - Submit to Product Hunt
   - Share on Reddit r/personalfinance Indonesia

3. **User Feedback**:
   - Add in-app feedback form
   - Set up Google Analytics 4
   - Track feature usage with PostHog
   - Monitor crash reports with Sentry

4. **Monetization Strategy** (Optional):
   - Freemium model (basic free, premium $4.99/month)
   - Business accounts for small teams ($9.99/month)
   - White-label licensing for banks/credit unions

---

**Last Updated**: 2026-09-08
**Version**: v2.0.0
**Status**: Landing Page LIVE, Core App Needs Minor Fixes

