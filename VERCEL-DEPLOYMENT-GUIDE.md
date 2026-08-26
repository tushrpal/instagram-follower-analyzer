# Deploy Frontend to Vercel + Backend on Render

## Overview

**Current Setup:**
- Frontend + Backend both on Render → Slow (800ms TTFB)

**New Setup:**
- Frontend on Vercel → Fast (<300ms TTFB)
- Backend stays on Render → Works fine for API calls

---

## Step 1: Prepare Backend for Vercel Frontend (5 minutes)

### Update CORS to Allow Vercel Domain

**File:** `backend/server.js` (around line 113)

**Current:**
```javascript
cors({
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.APP_URL || "https://instagram-follower-analyzer.onrender.com", "http://localhost:5000", "http://localhost"]
      : ["http://localhost:3000"],
  credentials: true,
})
```

**Change to:**
```javascript
cors({
  origin:
    process.env.NODE_ENV === "production"
      ? [
          "https://instafollowtracker.com",
          "https://*.vercel.app", // Allow Vercel preview deployments
          process.env.APP_URL || "https://instagram-follower-analyzer.onrender.com",
          "http://localhost:5000",
          "http://localhost:3000"
        ]
      : ["http://localhost:3000"],
  credentials: true,
})
```

**Deploy this change to Render:**
```bash
git add backend/server.js
git commit -m "feat: add Vercel CORS support"
git push
```

Wait for Render to redeploy (2-3 minutes).

---

## Step 2: Create Vercel Account & Install CLI (5 minutes)

### A. Sign Up
1. Go to: https://vercel.com/signup
2. Sign up with **GitHub** (easiest - connects your repos)
3. Authorize Vercel to access your GitHub

### B. Install Vercel CLI
```bash
npm install -g vercel
```

### C. Login
```bash
vercel login
```
Follow the prompts to authenticate.

---

## Step 3: Configure Frontend for Vercel (2 minutes)

### Create `vercel.json` in Frontend Directory

Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "devCommand": "npm start",
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/scripts/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*\\.(png|jpg|jpeg|gif|svg|ico|woff|woff2))",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://instagram-follower-analyzer.onrender.com/api/:path*"
    }
  ]
}
```

**What this does:**
- Tells Vercel to build your React app
- Sets up SPA routing (all routes → index.html)
- Proxies `/api/*` requests to your Render backend
- Sets cache headers for static files

---

## Step 4: Deploy to Vercel (5 minutes)

### From Your Frontend Directory:

```bash
cd frontend
vercel
```

**You'll be asked:**

1. **Set up and deploy?** → `Y`
2. **Which scope?** → Select your account
3. **Link to existing project?** → `N`
4. **What's your project's name?** → `instafollowtracker` (or whatever you prefer)
5. **In which directory is your code located?** → `.` (current directory)
6. **Want to override settings?** → `N`

**Vercel will:**
- Build your app
- Deploy to a preview URL like `instafollowtracker.vercel.app`
- Give you the URL

**Test the preview URL** - make sure the app loads!

---

## Step 5: Connect Your Custom Domain (5 minutes)

### A. Add Domain in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project (`instafollowtracker`)
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `instafollowtracker.com`

### B. Update DNS in Cloudflare

Vercel will show you what DNS records to add. You need to:

1. Go to **Cloudflare Dashboard** → **DNS**
2. **Delete or pause** the current A record for `instafollowtracker.com`
3. Add a **CNAME record:**
   - Name: `@` (or `instafollowtracker.com`)
   - Target: `cname.vercel-dns.com`
   - Proxy status: **Proxied** (orange cloud)

4. If Vercel also asks for `www`:
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **Proxied**

**Wait 5-10 minutes** for DNS to propagate.

### C. Verify in Vercel

Go back to Vercel → Domains. It should show a green checkmark when the domain is connected.

---

## Step 6: Set Environment Variables (2 minutes)

In Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add these:

**Key:** `REACT_APP_API_URL`  
**Value:** (leave empty - we're using the proxy in vercel.json)  
**Environments:** Production, Preview, Development

3. Click **Save**
4. **Redeploy** (Settings → Deployments → Latest → ... → Redeploy)

---

## Step 7: Test Everything (5 minutes)

### A. Visit Your Site
Go to: https://instafollowtracker.com

### B. Check What to Test:

1. ✅ **Homepage loads fast** - Should feel instant compared to before
2. ✅ **Upload works** - Try uploading an Instagram export
3. ✅ **Login works** - Try signing in (tests API connection)
4. ✅ **No CORS errors** - Open DevTools Console, should be clean
5. ✅ **Analytics tracking** - Check if Google Analytics loads

### C. Verify TTFB Improvement

```bash
curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s https://instafollowtracker.com
```

Should now be **<300ms** (was 800ms).

---

## Step 8: Update Cloudflare Page Rules (Optional)

Since your frontend is now on Vercel, you can **delete the Cloudflare Page Rules** we created earlier (Vercel handles caching now).

Or keep them - they won't hurt, just redundant.

---

## Expected Results

### Before (All on Render):
- TTFB: 800ms (warm) / 1400ms (cold start)
- Page load: 3-5 seconds
- Performance score: 60-65

### After (Frontend on Vercel + Backend on Render):
- TTFB: 200-300ms
- Page load: 1.5-2.5 seconds
- Performance score: 75-80

**Your SEO score should jump to 80-82.**

---

## Troubleshooting

### "CORS error" in console
- Make sure you deployed the CORS update to Render backend
- Check backend logs: `https://dashboard.render.com/` → Your service → Logs

### "API calls failing"
- Check `vercel.json` proxy is correct
- Verify backend URL in rewrites matches your Render URL

### "Custom domain not working"
- Wait longer (DNS can take 30 min)
- Check Cloudflare DNS has CNAME pointing to `cname.vercel-dns.com`
- Make sure Cloudflare proxy is ON (orange cloud)

### "Build failed in Vercel"
- Check build logs in Vercel dashboard
- Make sure `package.json` has all dependencies
- Try building locally first: `cd frontend && npm run build`

---

## Rollback Plan (If Something Breaks)

If anything goes wrong:

1. **Change DNS back** in Cloudflare to point to Render
2. **Wait 5-10 minutes** for DNS to propagate
3. **Debug** the issue
4. **Try again** when ready

Your backend stays on Render the whole time, so it's always working.

---

## Cost Comparison

**Current (All on Render):**
- Free tier: $0/month (but slow with cold starts)
- Starter: $7/month

**New (Vercel + Render):**
- Vercel Frontend: $0/month (generous free tier)
- Render Backend: $0/month (free tier is fine for API)
- **Total: $0/month** with better performance!

**OR upgrade backend later:**
- Vercel Frontend: $0/month
- Render Backend: $7/month (no cold starts)
- **Total: $7/month** with excellent performance everywhere

---

## Next Steps After Deployment

1. **Monitor for 24-48 hours** - Check for any errors
2. **Run Lighthouse audit** - Should see ~75-80 score
3. **Consider upgrading backend** to Render Starter ($7/mo) if you see traffic growing
4. **Keep the backend on free tier** if it's handling the load fine

---

**Ready to start? Begin with Step 1 (updating CORS in backend).**
