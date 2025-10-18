# 🚀 Deployment Guide - Vercel

Deploy the Ora Admin Web Interface to Vercel in under 10 minutes.

## Prerequisites

- Vercel account (free tier works)
- GitHub repository with your code
- Firebase project set up (see [SETUP_FIREBASE.md](SETUP_FIREBASE.md))

## Step 1: Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

## Step 2: Connect GitHub Repository

### Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select **Next.js** as framework preset (auto-detected)
5. **Don't deploy yet** - we need to add environment variables first

## Step 3: Configure Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

### Client Variables (Public)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ora-admin.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ora-admin
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ora-admin.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Server Variables (Secret)

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

**IMPORTANT**:
- Mark `FIREBASE_SERVICE_ACCOUNT_JSON` as **"Secret"**
- Apply to **Production**, **Preview**, and **Development** environments

## Step 4: Deploy

### Via Dashboard

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Visit your deployment URL: `https://your-project.vercel.app`

### Via CLI

```bash
# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Step 5: Configure Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your domain: `admin.ora.com`
3. Follow DNS configuration instructions:
   - Add CNAME record: `admin` → `cname.vercel-dns.com`
4. Wait for DNS propagation (~10 minutes)
5. SSL certificate automatically provisioned

## Step 6: Test Deployment

1. Visit your deployment URL
2. Navigate to `/login`
3. Sign in with admin credentials
4. Verify all features work:
   - ✅ Dashboard loads
   - ✅ User management
   - ✅ Content management
   - ✅ File uploads
   - ✅ Commands execute
   - ✅ Analytics charts display

## Step 7: Configure Redirects (Optional)

Create `vercel.json` in project root:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/admin",
      "permanent": false
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

## Environment-Specific Configuration

### Production

- Use production Firebase project
- Enable Firebase App Check (optional)
- Set `NODE_ENV=production`

### Preview (Staging)

- Use staging Firebase project
- Test new features before production
- Automatic preview deployments on PR

### Development

- Use local Firebase emulators (optional)
- Set `NODE_ENV=development`

## Performance Optimization

### 1. Enable Vercel Analytics

```bash
npm install @vercel/analytics
```

In `app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Enable Image Optimization

Already configured in `next.config.js`:

```javascript
images: {
  domains: ['firebasestorage.googleapis.com']
}
```

### 3. Configure Caching

API routes automatically cached via `Cache-Control` headers.

## Monitoring & Logs

### View Logs

- **Vercel Dashboard → Deployments → [Deployment] → Runtime Logs**
- Real-time logs for debugging

### Set Up Alerts

1. Go to **Settings → Notifications**
2. Enable alerts for:
   - Failed deployments
   - High error rate
   - Performance degradation

### Monitor Performance

- **Vercel Dashboard → Analytics**
- View:
  - Page load times
  - Web Vitals (LCP, FID, CLS)
  - Geographic distribution

## Security Best Practices

### 1. Rotate Service Account Keys

Every 90 days:

1. Generate new Firebase service account key
2. Update `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel
3. Delete old key from Firebase Console

### 2. Review Environment Variables

Regularly audit which variables are exposed:

```bash
vercel env ls
```

### 3. Enable Vercel Security Headers

Add to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        }
      ]
    }
  ];
}
```

## Continuous Deployment

### Automatic Deployments

- **Production**: Deploys on push to `main` branch
- **Preview**: Deploys on pull requests
- **Rollback**: Instant rollback to previous deployment

### Deploy Hooks

Create webhook for manual triggers:

1. **Settings → Git → Deploy Hooks**
2. Create hook for `main` branch
3. Use webhook URL to trigger deployments

### GitHub Actions Integration

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### Build Fails

**Error**: "Module not found"

```bash
# Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

**Error**: "TypeScript errors"

```bash
# Fix locally first
npm run type-check
# Fix errors, then commit and push
```

### Runtime Errors

**Error**: "Firebase initialization failed"

- Check `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly
- Ensure JSON is valid (no line breaks)
- Verify service account has necessary permissions

**Error**: "Authentication not working"

- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check Firebase Auth is enabled
- Test locally first with same environment variables

### Performance Issues

**Slow page loads**:

- Enable Vercel Analytics to identify bottlenecks
- Check Firebase quota limits
- Optimize images with Next.js Image component
- Review API response times

## Cost Optimization

### Vercel Pricing

- **Hobby (Free)**: 100 GB bandwidth/month, unlimited deployments
- **Pro ($20/month)**: 1 TB bandwidth, advanced analytics
- **Enterprise**: Custom pricing

### Firebase Pricing

- **Spark (Free)**: 10GB storage, 50K reads/day, 20K writes/day
- **Blaze (Pay-as-you-go)**: No limits, pay for usage

### Tips to Reduce Costs

1. Enable caching on API routes
2. Use Firestore efficiently (minimize reads)
3. Optimize image sizes before upload
4. Use CDN for static assets
5. Monitor usage in Firebase Console

## Next Steps

- ✅ Set up monitoring and alerts
- ✅ Configure custom domain
- ✅ Enable Vercel Analytics
- ✅ Set up staging environment
- ✅ Create deployment checklist
- ✅ Document rollback procedures

---

**Deployment successful?** 🎉 Access your admin dashboard at your Vercel URL!

**Need help?** Check the [main README](../README.md) or [Firebase setup guide](SETUP_FIREBASE.md).
