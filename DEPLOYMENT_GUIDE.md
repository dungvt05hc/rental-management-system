# 🚀 Deployment Guide

Complete guide to deploy your Rental Management System to production.

## Architecture Overview

- **Frontend**: Netlify or Cloudflare Pages (React + Vite)
- **Backend**: Google Cloud Run (.NET 8 API)
- **Database**: Supabase PostgreSQL (Transaction Pooler for serverless)

---

## 📋 Prerequisites

### 1. Install Required Tools
```bash
# Google Cloud CLI
# macOS
brew install google-cloud-sdk

# Authenticate
gcloud auth login
gcloud auth configure-docker

# Create GCP project (if needed)
gcloud projects create your-project-id --name="Rental Management"
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Create Accounts
- **Supabase**: https://supabase.com (Free tier available)
- **Netlify**: https://netlify.com (Free tier available)
- **Cloudflare Pages**: https://pages.cloudflare.com (Free tier available)
- **Google Cloud**: https://cloud.google.com (Free credits available)

---

## 🗄️ Phase 1: Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: rental-management
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to initialize (~2 minutes)

### Step 2: Get Database Connection String
1. In Supabase dashboard, go to **Project Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **Transaction** mode (important for serverless!)
4. Copy the connection string:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   postgresql://postgres.fpvgtejnkxkushmzkstu:qijfiw-qetqof-paJmo4@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual password

### Step 3: Run Database Migrations
```bash
# Set the connection string temporarily
export DATABASE_URL="your-supabase-transaction-pooler-connection-string"

# Navigate to the API project
cd RentalManagementSystem/Backend/RentalManagement.Api

# Apply migrations to Supabase
dotnet ef database update --connection "$DATABASE_URL"
```

**Note**: The app will also auto-migrate on first startup, but running manually ensures everything works.

---

## ☁️ Phase 2: Backend Deployment (Google Cloud Run)

### Step 1: Prepare Configuration
Edit `deploy-backend.sh` and update these values:

```bash
PROJECT_ID="your-gcp-project-id"  # Your GCP project ID
REGION="us-central1"               # Choose: us-central1, europe-west1, asia-east1, etc.
SERVICE_NAME="rental-management-api"

# From Supabase (Step 1.2)
DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres"

# Generate a secure random string (at least 32 characters)
JWT_SECRET_KEY="$(openssl rand -base64 32)"

# Will update after deploying frontend
FRONTEND_URL="https://your-frontend-url.netlify.app"
```

### Step 2: Build and Deploy
```bash
# Make script executable
chmod +x deploy-backend.sh

# Run deployment
./deploy-backend.sh
```

This will:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Output your API URL

### Step 3: Test Your API
```bash
# Your API URL will be something like:
# https://rental-management-api-xxxx-uc.a.run.app

# Test health
curl https://your-api-url.run.app/swagger

# Should return Swagger UI
```

### Step 4: Configure Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service rental-management-api \
  --domain api.yourdomain.com \
  --region us-central1
```
After deploy:
Backend Deployed
API URL: https://rental-management-api-lfgedmy2ua-uc.a.run.app
Swagger: https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
---

## 🎨 Phase 3: Frontend Deployment

### Option A: Netlify (Recommended)

#### Step 1: Prepare Environment Variables
Create `.env.production` in `RentalManagementSystem/Frontend/`:

```bash
VITE_API_URL=https://your-cloud-run-url.run.app
```

#### Step 2: Deploy via Git (Recommended)
1. Push your code to GitHub
2. Go to https://app.netlify.com
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect your GitHub repository
5. Configure build settings:
   - **Base directory**: `RentalManagementSystem/Frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-cloud-run-url.run.app`
7. Click **"Deploy site"**

#### Step 3: Deploy via CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy from frontend directory
cd RentalManagementSystem/Frontend

# Build first
npm run build

# Deploy
netlify deploy --prod
```

#### Step 4: Configure Custom Domain (Optional)
1. In Netlify dashboard, go to **Domain settings**
2. Click **"Add custom domain"**
3. Follow DNS configuration instructions

---

### Option B: Cloudflare Pages

#### Step 1: Deploy via Git
1. Push code to GitHub
2. Go to https://dash.cloudflare.com
3. Navigate to **Workers & Pages** → **Create application** → **Pages**
4. Connect your GitHub repository
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `RentalManagementSystem/Frontend`
6. Add environment variable:
   - `VITE_API_URL` = `https://your-cloud-run-url.run.app`
7. Click **"Save and Deploy"**

#### Step 2: Deploy via CLI
```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd RentalManagementSystem/Frontend
npm run build
wrangler pages deploy dist --project-name rental-management
```

---

## 🔄 Phase 4: Connect Everything

### Step 1: Update Backend CORS
Once you have your frontend URL, update the backend:

```bash
# Update Cloud Run environment variables
gcloud run services update rental-management-api \
  --set-env-vars "FRONTEND_URL=https://your-actual-frontend-url.netlify.app" \
  --region us-central1
```

### Step 2: Update Frontend API URL
Update environment variable in Netlify/Cloudflare:
- **Netlify**: Site settings → Environment variables
- **Cloudflare**: Pages project → Settings → Environment variables

Set: `VITE_API_URL=https://your-cloud-run-url.run.app`

---

## 🧪 Phase 5: Testing

### Test Backend
```bash
# Health check
curl https://your-api-url.run.app/swagger

# Test auth endpoint
curl -X POST https://your-api-url.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalmanagement.com","password":"Admin123!"}'
```

### Test Frontend
1. Visit your frontend URL
2. Try to login with:
   - **Email**: admin@rentalmanagement.com
   - **Password**: Admin123!

---

## 📊 Monitoring & Logs

### Google Cloud Run Logs
```bash
# View logs
gcloud run services logs read rental-management-api \
  --region us-central1 \
  --limit 50

# Stream logs
gcloud run services logs tail rental-management-api --region us-central1
```

### Supabase Monitoring
- Go to Supabase Dashboard → **Database** → **Reports**
- Monitor active connections, query performance

### Netlify/Cloudflare Logs
- Check deploy logs in respective dashboards
- Monitor analytics and performance

---

## 💰 Cost Estimates (Free Tiers)

| Service | Free Tier | Expected Cost |
|---------|-----------|---------------|
| **Supabase** | 500 MB database, 2 GB bandwidth | $0/month (within limits) |
| **Cloud Run** | 2M requests, 360k GB-seconds | $0-5/month (low traffic) |
| **Netlify** | 100 GB bandwidth, 300 build minutes | $0/month (small sites) |
| **Cloudflare Pages** | Unlimited requests, 500 builds/month | $0/month |

**Total**: ~$0-10/month for low-medium traffic

---

## 🔐 Security Checklist

- [ ] Changed default JWT secret key
- [ ] Updated Supabase database password
- [ ] Configured CORS properly
- [ ] Enabled HTTPS (automatic on all platforms)
- [ ] Set up environment variables (not in code)
- [ ] Configured rate limiting (TODO)
- [ ] Set up monitoring and alerts
- [ ] Backed up Supabase database

---

## 🚨 Troubleshooting

### Backend Issues

**Problem**: Cloud Run deployment fails
```bash
# Check logs
gcloud run services logs read rental-management-api --region us-central1 --limit 100

# Common issues:
# 1. Wrong connection string format
# 2. Missing environment variables
# 3. Port configuration (must be 8080)
```

**Problem**: Database connection fails
```bash
# Test connection locally
export DATABASE_URL="your-supabase-connection-string"
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet run

# Check Supabase pooler status in dashboard
```

### Frontend Issues

**Problem**: API calls fail (CORS errors)
- Verify `FRONTEND_URL` is set in Cloud Run
- Check browser console for exact error
- Ensure API URL is correct in frontend env vars

**Problem**: Build fails
```bash
# Clear cache and rebuild
cd RentalManagementSystem/Frontend
rm -rf node_modules dist
npm install
npm run build
```

---

## 🔄 CI/CD Setup (Optional)

### GitHub Actions for Backend
Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - 'RentalManagementSystem/Backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and Push
        run: |
          gcloud builds submit \
            --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/rental-management-api \
            RentalManagementSystem/Backend
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy rental-management-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/rental-management-api \
            --region us-central1 \
            --platform managed
```

---

## 📝 Environment Variables Reference

### Backend (Cloud Run)
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase transaction pooler connection | `postgresql://postgres.xxx...` |
| `JWT_SECRET_KEY` | JWT signing key (32+ chars) | Generated via `openssl rand -base64 32` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://app.netlify.app` |
| `ASPNETCORE_ENVIRONMENT` | Environment name | `Production` |

### Frontend (Netlify/Cloudflare)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.run.app` |

---

## 🎯 Next Steps

1. ✅ Deploy database (Supabase)
2. ✅ Deploy backend (Cloud Run)
3. ✅ Deploy frontend (Netlify/Cloudflare)
4. ⬜ Set up custom domains
5. ⬜ Configure CI/CD pipelines
6. ⬜ Set up monitoring and alerts
7. ⬜ Configure backups
8. ⬜ Set up rate limiting
9. ⬜ Add application monitoring (e.g., Sentry)
10. ⬜ Performance optimization

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Netlify Docs**: https://docs.netlify.com
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages

---

**Happy Deploying! 🎉**

# 🚀 Frontend Deployment Guide

Your frontend has been successfully built and is ready for deployment!

**Build Output Location:** `RentalManagementSystem/Frontend/dist/`

---

## 📦 Option 1: Deploy to Netlify

### Method A: Drag & Drop Deployment (Easiest)

1. **Go to Netlify:**
   - Visit: https://app.netlify.com/drop
   - Login with your Netlify account

2. **Drag & Drop:**
   - Drag the entire `RentalManagementSystem/Frontend/dist` folder into the upload zone
   - Wait for deployment to complete (~1 minute)

3. **Configure Environment Variables:**
   - Go to your site's dashboard
   - Navigate to: **Site configuration** → **Environment variables**
   - Add the following variable:
     - **Key:** `VITE_API_BASE_URL`
     - **Value:** `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`
   - Click **Save**

4. **Redeploy:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**

### Method B: Git-based Deployment (Recommended for Production)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add frontend deployment configuration"
   git push origin main
   ```

2. **Go to Netlify:**
   - Visit: https://app.netlify.com
   - Click **Add new site** → **Import an existing project**

3. **Connect to GitHub:**
   - Click **GitHub** and authorize Netlify
   - Select your repository

4. **Configure Build Settings:**
   - **Base directory:** `RentalManagementSystem/Frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

5. **Add Environment Variable:**
   - Click **Add environment variables**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`

6. **Deploy:**
   - Click **Deploy site**
   - Wait for deployment (~2-3 minutes)

---

## 🌐 Option 2: Deploy to Cloudflare Pages

### Method A: Drag & Drop Deployment via Wrangler CLI

1. **Install Wrangler (if not installed):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy:**
   ```bash
   cd RentalManagementSystem/Frontend
   wrangler pages deploy dist --project-name rental-management
   ```

4. **Add Environment Variable:**
   - Go to https://dash.cloudflare.com
   - Navigate to **Workers & Pages** → Your project
   - Go to **Settings** → **Environment variables**
   - Add:
     - **Variable name:** `VITE_API_BASE_URL`
     - **Value:** `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`
   - Save and redeploy

### Method B: Git-based Deployment

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add frontend deployment configuration"
   git push origin main
   ```

2. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com
   - Navigate to **Workers & Pages**
   - Click **Create application** → **Pages** → **Connect to Git**

3. **Connect to GitHub:**
   - Select your repository
   - Click **Begin setup**

4. **Configure Build Settings:**
   - **Project name:** rental-management
   - **Production branch:** main
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `RentalManagementSystem/Frontend`

5. **Add Environment Variable:**
   - Click **Add environment variable**
   - **Variable name:** `VITE_API_BASE_URL`
   - **Value:** `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`

6. **Deploy:**
   - Click **Save and Deploy**
   - Wait for deployment (~2-3 minutes)

---

## 🔄 After Deployment - Update Backend CORS

Once you have your frontend URL(s) from Netlify and/or Cloudflare Pages, you need to update the backend CORS settings:

### Run the update script:

```bash
cd /Users/dungvt/Projects/rental-management-system
./update-backend-cors.sh
```

**Enter your frontend URLs when prompted. For example:**
- `https://your-app-name.netlify.app`
- `https://rental-management.pages.dev`

The script will update your Cloud Run backend to accept requests from these origins.

---

## ✅ Testing Your Deployment

After deploying and updating CORS:

1. **Visit your frontend URL**
2. **Test the login:**
   - Email: `admin@rentalmanagement.com`
   - Password: `Admin123!`
3. **Verify API connectivity** by navigating through the dashboard

---

## 🎯 Current Status

- ✅ **Backend API:** Deployed and running at https://rental-management-api-lfgedmy2ua-uc.a.run.app
- ✅ **Database:** Connected to Supabase, all tables created
- ✅ **Frontend Build:** Ready in `RentalManagementSystem/Frontend/dist/`
- ⏳ **Frontend Deploy:** Choose your platform and follow the steps above
- ⏳ **CORS Update:** Run after getting frontend URL

---

## 📝 Quick Reference

**API Base URL:**
```
https://rental-management-api-lfgedmy2ua-uc.a.run.app/api
```

**Admin Credentials:**
- Email: `admin@rentalmanagement.com`
- Password: `Admin123!`

**Swagger Documentation:**
```
https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
```

---

## 🆘 Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Make sure you ran `./update-backend-cors.sh`
2. Verify the frontend URL was added correctly
3. Clear browser cache and try again

### Environment Variables Not Working
- Make sure you redeploy after adding environment variables
- Check the variable name is exactly: `VITE_API_BASE_URL` (case-sensitive)
- Verify the API URL ends with `/api`

### Login Not Working
- Check browser console for errors
- Verify API URL is correct
- Test API directly: https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
