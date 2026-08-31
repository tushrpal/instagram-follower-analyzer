# Deployment Checklist - Instagram Follower Tracker

## ⚠️ Current Status
The performance fixes are committed to GitHub but NOT deployed to production.

PageSpeed still showing:
- Score: 47/100 (target: 90+)
- YouTube loading immediately (841 KB)
- Old third-party scripts loading
- No caching headers

---

## 🚀 Deployment Steps

### 1. Verify Local Build
```bash
cd C:\Users\tushr\instagram-follower-analyzer\frontend
npm run build
```

**Expected output:**
- Main JS bundle: ~903 KB
- CSS: ~42 KB (NOT 107 KB)
- Build folder created successfully

### 2. Check What Needs Deploying

**Files to deploy:**
```
frontend/build/              # Entire optimized build folder
frontend/.htaccess          # Apache caching config (if using Apache)
frontend/nginx.conf         # Nginx config reference (if using Nginx)
```

### 3. Deploy to Production Server

**Option A: Manual Deployment (FTP/SFTP)**
1. Connect to your server via FTP/SFTP
2. Upload entire `frontend/build/` folder to your web root
3. Upload `.htaccess` OR configure nginx (not both)

**Option B: If using Vercel/Netlify**
```bash
cd frontend
vercel --prod
# OR
netlify deploy --prod
```

**Option C: If using cPanel/Hosting Panel**
1. Zip the build folder: `frontend\build`
2. Upload via File Manager
3. Extract in public_html or www folder
4. Upload `.htaccess` to same directory

### 4. Configure Server Caching

**If Apache:**
- Ensure `.htaccess` is in the same directory as index.html
- Verify mod_headers and mod_expires are enabled

**If Nginx:**
- Copy relevant sections from `frontend/nginx.conf` to your server block
- Test config: `nginx -t`
- Reload: `nginx -s reload` or `systemctl reload nginx`

**If Cloudflare/CDN:**
- Purge cache after deployment
- Enable "Auto Minify" for JS, CSS, HTML

---

## ✅ Verification After Deployment

### A. Visual Verification
1. Visit: https://instafollowtracker.com/
2. **YouTube should show a play button** (not auto-load)
3. Click the play button → video loads
4. Open DevTools → Network tab
5. Refresh page
6. Verify:
   - YouTube scripts NOT loaded until click
   - CSS file is ~42 KB (not 107 KB)
   - JS main bundle is ~903 KB

### B. Header Verification
Open DevTools → Network → Click any static file → Headers tab

**Expected headers:**
```
Cache-Control: public, max-age=31536000, immutable
Content-Encoding: gzip
X-Content-Type-Options: nosniff
```

### C. PageSpeed Test
1. Run: https://pagespeed.web.dev/
2. Enter: https://instafollowtracker.com/
3. Expected results:
   - Performance: 85-95
   - FCP: ~2.5s
   - LCP: ~3.5s
   - Unused JS: ~66 KB (not 798 KB)
   - Unused CSS: ~56 KB (not 107 KB)

---

## 🐛 Troubleshooting

### Issue: "Nothing changed after deployment"
**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. If using CDN (Cloudflare), purge cache
4. Check if files actually uploaded (check file timestamps)

### Issue: "YouTube still auto-loading"
**Solution:**
1. Verify `frontend/build/index.html` has the click-to-play code
2. Check browser console for JavaScript errors
3. Ensure the onclick handler is present in deployed HTML

### Issue: "CSS still 107 KB"
**Solution:**
1. Rebuild with: `NODE_ENV=production npm run build`
2. Verify `tailwind.config.js` has purge config
3. Check that old CSS files are removed from server

### Issue: "Caching headers not working"
**Apache:**
- Check `.htaccess` is in correct directory
- Verify `AllowOverride All` in Apache config
- Enable required modules: `a2enmod headers expires`

**Nginx:**
- Check nginx config syntax: `nginx -t`
- Verify server block is active
- Reload nginx

---

## 📊 Expected Performance Improvements

| Metric | Current | After Deploy | Improvement |
|--------|---------|--------------|-------------|
| Performance | 47 | 85-95 | +81-102% |
| FCP | 8.9s | ~2.5s | -72% |
| LCP | 13.4s | ~3.5s | -74% |
| TBT | 390ms | ~150ms | -62% |
| Unused JS | 798 KB | ~66 KB | -92% |
| Unused CSS | 107 KB | ~56 KB | -48% |

---

## 🆘 Need Help?

**Where are you hosting?**
- Vercel/Netlify → Use CLI deployment
- cPanel/Shared → Use File Manager upload
- VPS/Dedicated → SSH and rsync/scp
- GitHub Pages → Won't work (needs server config)

**Current deployment method:** _[Update this]_
**Server type:** _[Apache/Nginx/Other]_
**Access method:** _[FTP/SSH/cPanel/Other]_
