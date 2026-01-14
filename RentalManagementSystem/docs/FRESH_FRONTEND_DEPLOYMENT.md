# 🚀 Fresh Frontend Deployment Guide

Complete step-by-step guide to deploy a brand new frontend to Netlify.

**Last Updated**: January 12, 2026

---

## 📊 Current Deployment Status

### **✅ Live Application**
- **Frontend URL**: https://rental-management-fresh-2026.netlify.app
- **Backend API**: https://rental-management-api-lfgedmy2ua-uc.a.run.app
- **Admin Dashboard**: https://app.netlify.com/projects/rental-management-fresh-2026

---

## 🎯 Prerequisites

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Login to Netlify
```bash
netlify login
```
This will open your browser for authentication.

---

## 📝 Step-by-Step Deployment Process

### **Step 1: Build the Frontend**

Navigate to the frontend directory and build for production:

```bash
cd /Users/dungvt/Projects/rental-management-system/RentalManagementSystem/Frontend
npm install
npm run build
```

**Expected Output:**
```
✓ 2301 modules transformed.
dist/index.html                   0.47 kB │ gzip:   0.31 kB
dist/assets/index-gh9kAUHO.css   60.45 kB │ gzip:  10.53 kB
dist/assets/index-BbTh9Gk7.js   847.79 kB │ gzip: 232.57 kB
✓ built in 2.13s
```

**What this does:**
- Compiles TypeScript to JavaScript
- Bundles all React components
- Optimizes CSS with Tailwind
- Minifies and compresses all assets
- Generates production-ready files in `dist/` folder

---

### **Step 2: Create a New Netlify Site**

Create a brand new site on Netlify with a unique name:

```bash
netlify sites:create --name rental-management-fresh-2026
```

**You'll be prompted to:**
1. Select your team (choose "Rental Management" or your team name)
2. Wait for site creation

**Expected Output:**
```
Project Created

Admin URL:  https://app.netlify.com/projects/rental-management-fresh-2026
URL:        https://rental-management-fresh-2026.netlify.app
Project ID: c8556708-f61f-4bce-bb60-6ca0c52867f0
```

**Note:** If your directory is linked to an old site, you'll see a warning. Proceed to Step 3.

---

### **Step 3: Unlink Old Site (if needed)**

If you see a message about being linked to another site:

```bash
netlify unlink
```

**Expected Output:**
```
Unlinked /Users/dungvt/.../Frontend/netlify.toml from [old-site-name]
```

---

### **Step 4: Link to the New Site**

Link your project to the newly created Netlify site:

```bash
netlify link --id c8556708-f61f-4bce-bb60-6ca0c52867f0
```

**Replace the ID** with your actual Project ID from Step 2.

**Expected Output:**
```
✔ Linked to rental-management-fresh-2026
```

---

### **Step 5: Configure Environment Variables**

Set the backend API URL so your frontend knows where to send requests:

```bash
netlify env:set VITE_API_BASE_URL "https://rental-management-api-lfgedmy2ua-uc.a.run.app/api"
```

**Expected Output:**
```
Set environment variable VITE_API_BASE_URL=https://rental-management-api-lfgedmy2ua-uc.a.run.app/api in the all context
```

**Important Environment Variables:**
- `VITE_API_BASE_URL`: Your backend API endpoint
- Must start with `VITE_` for Vite to include it in the build
- This variable is accessible in your React app via `import.meta.env.VITE_API_BASE_URL`

---

### **Step 6: Deploy to Production**

Deploy your built frontend to Netlify:

```bash
netlify deploy --prod --dir=dist
```

**What happens during deployment:**
1. ✅ Netlify builds your app (runs `npm run build` automatically)
2. ✅ Uploads all files from the `dist/` directory
3. ✅ Distributes files to Netlify's global CDN
4. ✅ Configures automatic HTTPS
5. ✅ Makes your site live instantly

**Expected Output:**
```
🚀 Deploy complete

Deployed to production URL: https://rental-management-fresh-2026.netlify.app
Unique deploy URL: https://[hash]--rental-management-fresh-2026.netlify.app
```

**Deployment typically takes:** 20-40 seconds

---

### **Step 7: Update Backend CORS Configuration**

Your backend needs to allow requests from your new frontend URL:

```bash
cd /Users/dungvt/Projects/rental-management-system
printf "https://rental-management-fresh-2026.netlify.app\n\ny\n" | ./update-backend-cors.sh
```

**This command:**
1. Adds your new frontend URL to the backend's CORS allowed origins
2. Redeploys the backend with updated CORS settings
3. Takes about 1-2 minutes to complete

**Expected Output:**
```
✅ CORS settings updated successfully!

✅ Backend is now configured to accept requests from:
  ✓ https://rental-management-fresh-2026.netlify.app
```

---

## 🧪 Testing Your Deployment

### **1. Test Frontend Access**

Open your browser and navigate to:
```
https://rental-management-fresh-2026.netlify.app
```

You should see the login page.

### **2. Test Login**

Use the default admin credentials:
- **Email**: `admin@rentalmanagement.com`
- **Password**: `Admin123!`

### **3. Check Browser Console**

Press `F12` (or `Cmd+Option+I` on Mac) to open Developer Tools:

**What to check:**
- ✅ **Console Tab**: No CORS errors (should be clean)
- ✅ **Network Tab**: API calls return `200 OK` status
- ✅ **Application Tab**: JWT token stored in localStorage

**Common Issues:**
- ❌ CORS errors → Backend CORS not updated (run Step 7 again)
- ❌ 401 Unauthorized → Check credentials
- ❌ Network error → Backend might be down, check backend URL

---

## 🔄 Updating Your Deployment (Future Changes)

### **Making Code Changes**

1. **Edit your code** in the `src/` directory
2. **Test locally**:
   ```bash
   npm run dev
   ```
3. **Build for production**:
   ```bash
   npm run build
   ```
4. **Deploy**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### **Updating Environment Variables**

```bash
# Set a new variable
netlify env:set VARIABLE_NAME "value"

# List all variables
netlify env:list

# Delete a variable
netlify env:unset VARIABLE_NAME
```

**After changing environment variables, you MUST redeploy:**
```bash
netlify deploy --prod --dir=dist
```

---

## 📊 Monitoring Your Deployment

### **View Deployment Logs**

```bash
netlify logs:deploy
```

### **View Function Logs** (if using serverless functions)

```bash
netlify logs:function
```

### **Check Site Status**

```bash
netlify status
```

### **Access Netlify Dashboard**

Visit: https://app.netlify.com/projects/rental-management-fresh-2026

**In the dashboard you can:**
- View deployment history
- Manage environment variables
- Configure custom domains
- Set up redirects and headers
- View analytics
- Configure build settings

---

## 🔐 Security Best Practices

### **1. Environment Variables**
- ✅ Always use environment variables for API URLs
- ✅ Never commit `.env` files to Git
- ✅ Use different variables for development/production

### **2. HTTPS**
- ✅ Netlify automatically provides HTTPS
- ✅ Your site is secure by default
- ✅ No additional SSL configuration needed

### **3. API Security**
- ✅ Backend validates JWT tokens
- ✅ CORS restricts which domains can access your API
- ✅ Passwords are hashed in the database

---

## 💰 Netlify Free Tier Limits

| Resource | Free Tier Limit |
|----------|-----------------|
| **Bandwidth** | 100 GB/month |
| **Build Minutes** | 300 minutes/month |
| **Sites** | Unlimited |
| **Deploys** | Unlimited |
| **Team Members** | 1 (you) |

**For this app:**
- Typical usage: ~2-5 GB/month bandwidth
- Build time: ~2 minutes per deploy
- **Cost**: $0 (within free tier) ✅

---

## 🚨 Troubleshooting

### **Problem: CORS Errors in Browser**

**Symptoms:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
```bash
cd /Users/dungvt/Projects/rental-management-system
printf "https://rental-management-fresh-2026.netlify.app\n\ny\n" | ./update-backend-cors.sh
```

### **Problem: Build Fails**

**Check:**
```bash
# Install dependencies
npm install

# Try building locally
npm run build
```

**Common causes:**
- Missing dependencies
- TypeScript errors
- Environment variables not set

### **Problem: White Screen After Deploy**

**Check:**
1. Open browser console (F12)
2. Look for JavaScript errors
3. Check if environment variables are set:
   ```bash
   netlify env:list
   ```
4. Verify `VITE_API_BASE_URL` is set correctly

**Solution:**
```bash
# Set environment variable
netlify env:set VITE_API_BASE_URL "https://rental-management-api-lfgedmy2ua-uc.a.run.app/api"

# Redeploy
netlify deploy --prod --dir=dist
```

### **Problem: 404 on Page Refresh**

**Cause:** Single Page Application (SPA) routing

**Solution:** Netlify is already configured via `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If you don't have this file, create `netlify.toml` in your frontend root:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📞 Useful Commands Reference

### **Deployment Commands**
```bash
# Build for production
npm run build

# Deploy to production
netlify deploy --prod --dir=dist

# Deploy for preview (test URL)
netlify deploy --dir=dist
```

### **Site Management**
```bash
# List all your sites
netlify sites:list

# Check current site info
netlify status

# Open site in browser
netlify open

# Open admin dashboard
netlify open:admin
```

### **Environment Variables**
```bash
# Set variable
netlify env:set VAR_NAME "value"

# List all variables
netlify env:list

# Remove variable
netlify env:unset VAR_NAME

# Import from file
netlify env:import .env.production
```

### **Logs & Debugging**
```bash
# View deploy logs
netlify logs:deploy

# View function logs
netlify logs:function

# Stream live logs
netlify logs:deploy --tail
```

---

## 🎯 Quick Deployment Checklist

Use this checklist for every deployment:

- [ ] Code changes committed to Git (optional but recommended)
- [ ] Tested locally with `npm run dev`
- [ ] Built successfully with `npm run build`
- [ ] Environment variables configured
- [ ] Deployed with `netlify deploy --prod --dir=dist`
- [ ] Backend CORS updated (if new domain)
- [ ] Tested login functionality
- [ ] Checked browser console for errors
- [ ] Verified all pages load correctly

---

## 📈 Performance Optimization Tips

### **1. Code Splitting**
Consider splitting your bundle to reduce initial load time:
```typescript
// Use React lazy loading
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'));
```

### **2. Image Optimization**
- Use WebP format
- Compress images before uploading
- Use lazy loading for images

### **3. Caching**
Netlify automatically handles caching for static assets.

### **4. CDN**
Netlify deploys your site to a global CDN automatically - no configuration needed!

---

## 🔗 Important Links

### **Your Deployment**
- **Frontend**: https://rental-management-fresh-2026.netlify.app
- **Backend API**: https://rental-management-api-lfgedmy2ua-uc.a.run.app
- **Swagger Docs**: https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
- **Admin Dashboard**: https://app.netlify.com/projects/rental-management-fresh-2026

### **Documentation**
- **Netlify Docs**: https://docs.netlify.com
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev

---

## 🎓 Understanding the Deployment

### **What Happens When You Deploy?**

1. **Build Process** (`npm run build`):
   - TypeScript → JavaScript compilation
   - React components bundled with Vite
   - Tailwind CSS processed and optimized
   - Assets hashed for cache busting
   - Code minified and compressed

2. **Upload to Netlify**:
   - Files uploaded to Netlify's servers
   - Distributed to 100+ CDN locations globally
   - HTTPS certificate automatically configured
   - DNS configured (if using custom domain)

3. **Going Live**:
   - Deploy ID assigned (unique URL)
   - Production URL updated
   - Previous deployments kept for rollback
   - Atomic deployment (all-or-nothing)

### **Environment Variables Flow**

```
Netlify Dashboard → Build Process → Browser
         ↓
   VITE_API_BASE_URL
         ↓
   import.meta.env.VITE_API_BASE_URL
         ↓
   Used in api.ts for axios.create()
```

### **CORS Flow**

```
Browser (Frontend) → Preflight OPTIONS Request → Backend
                                                    ↓
                                          Check CORS Policy
                                                    ↓
                                    Allow: rental-management-fresh-2026.netlify.app?
                                                    ↓
                                              Yes → 200 OK
                                              No → CORS Error
```

---

## 🌟 Advanced Features

### **Custom Domain** (Optional)

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. In Netlify dashboard: **Domain Settings** → **Add custom domain**
3. Update DNS records as instructed
4. Netlify auto-provisions SSL certificate

### **Continuous Deployment** (Optional)

Connect to GitHub for automatic deployments:

1. Push code to GitHub repository
2. In Netlify: **Site Settings** → **Build & Deploy** → **Link Repository**
3. Every push to `main` branch auto-deploys

### **Deploy Preview** (Optional)

Create preview URLs for testing before production:

```bash
netlify deploy --dir=dist
```

This creates a unique URL like:
```
https://[hash]--rental-management-fresh-2026.netlify.app
```

---

## 📝 Deployment History

Keep track of your deployments:

| Date | Version | Changes | Deploy ID |
|------|---------|---------|-----------|
| 2026-01-12 | 1.0.0 | Initial fresh deployment | 6964651398dfcd5730c206ea |

**To view deployment history:**
```bash
netlify deploys:list
```

**To rollback to a previous deployment:**
1. Go to Netlify Dashboard → Deploys
2. Find the deploy you want to restore
3. Click **"Publish deploy"**

---

## ✅ Deployment Complete!

Your frontend is now live at:
🌐 **https://rental-management-fresh-2026.netlify.app**

**What's Working:**
- ✅ React SPA with TypeScript
- ✅ Tailwind CSS styling
- ✅ Automatic HTTPS
- ✅ Global CDN distribution
- ✅ Environment variables configured
- ✅ Backend API integration

**Next Steps:**
1. ✅ Update backend CORS (completed)
2. ✅ Test login functionality
3. 📱 Optional: Set up custom domain
4. 📊 Optional: Enable Netlify Analytics
5. 🔄 Optional: Set up continuous deployment from Git

---

**Happy Deploying! 🎉**

**Questions?** Check the Troubleshooting section or visit the Netlify Dashboard for logs and diagnostics.