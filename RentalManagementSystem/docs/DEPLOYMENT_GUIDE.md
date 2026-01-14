# 🚀 Deployment Guide - Rental Management System

Complete guide to deploy your Rental Management System to production with multiple deployment options.

---

## 🎯 DEPLOYMENT OPTIONS

Choose your preferred deployment platform:

### **Option 1: Render + Netlify (Recommended for Beginners)**
- **Backend**: Render Free Web Service
- **Frontend**: Netlify (existing)
- **Pros**: Simple setup, Git-based auto-deploy, free tier
- **Cons**: Cold starts (1 min), 750 hours/month limit

### **Option 2: Google Cloud Run + Netlify (Current)**
- **Backend**: Google Cloud Run
- **Frontend**: Netlify  
- **Pros**: Fast cold starts, pay-per-use, enterprise-grade
- **Cons**: More complex setup, potential costs

---

## ✅ YOUR CURRENT DEPLOYMENT

### **Backend (Google Cloud Run)**
- **API URL**: https://rental-management-api-lfgedmy2ua-uc.a.run.app
- **Swagger UI**: https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
- **Status**: ✅ Live and Running

### **Frontend (Netlify)**
- **Production URL**: https://candid-beijinho-543419.netlify.app
- **Status**: ✅ Deployed (Needs environment variable configuration)

### **Database (Supabase)**
- **Connection**: Transaction Pooler (Serverless)
- **Status**: ✅ Connected

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
- **Render**: https://render.com (Free tier available)

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

## ☁️ BACKEND DEPLOYMENT - Step by Step

### **Option 1: Render Deployment**

#### **Step 1: Prepare Render Configuration**

Your project already has these Render-ready files:
- ✅ `render.yaml` - Service configuration
- ✅ `Dockerfile` - Optimized for Render (port 10000)
- ✅ `deploy-render.sh` - Automated deployment script
- ✅ Health check endpoint at `/api/health`

#### **Step 2: Deploy to Render**

**Option A: Manual Setup (Recommended First Time)**

1. **Create Render Account**
   - Go to: https://dashboard.render.com
   - Sign up with GitHub (recommended for auto-deploy)

2. **Create Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your Git repository
   - Configure these settings:
     ```
     Name: rental-management-api
     Runtime: Docker
     Dockerfile Path: ./RentalManagementSystem/Backend/RentalManagement.Api/Dockerfile
     Docker Context: ./RentalManagementSystem/Backend/RentalManagement.Api
     Branch: main
     Plan: Free
     Region: Oregon (free regions: Oregon, Frankfurt, Singapore)
     ```

3. **Add Environment Variables**
   ```bash
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:10000
   DATABASE_URL=Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true
   JWT_SECRET_KEY=Nw6OuBAYTsjMpAvDW1r7xo62KAa8/7eTjS/+a9jO0h4=
   FRONTEND_URL=https://rental-management-fresh-2026.netlify.app
   ```

4. **Deploy**
   - Click **"Create Web Service"**
   - Wait 3-5 minutes for initial deployment
   - Your API will be at: `https://rental-management-api.onrender.com`

**Option B: Automated Setup**

```bash
# Navigate to project root
cd /Users/dungvt/Projects/rental-management-system

# Run deployment script
./deploy-render.sh
```

#### **Step 3: Update Frontend for Render Backend**

```bash
# Update frontend to use Render backend URL
./update-frontend-for-render.sh https://your-render-service.onrender.com

# The script will:
# 1. Find and update API configuration files
# 2. Update environment variables
# 3. Provide instructions for Netlify rebuild
```

#### **Step 4: Update Netlify Environment Variables**

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com → Your Site → Site Settings → Environment Variables

2. **Update/Add Variables**
   ```
   VITE_API_URL=https://your-render-service.onrender.com/api
   REACT_APP_API_URL=https://your-render-service.onrender.com/api
   ```

3. **Trigger Redeploy**
   - Go to **Deploys** → **Trigger deploy** → **Deploy site**

#### **Step 5: Test Render Deployment**

```bash
# Test health check
curl https://your-render-service.onrender.com/api/health

# Test authentication
curl -X POST 'https://your-render-service.onrender.com/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@rentalmanagement.com","password":"Admin123!"}'

# Test protected endpoint (use token from login)
curl 'https://your-render-service.onrender.com/api/rooms' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

---

### **Option 2: Google Cloud Run Deployment**

#### **Prerequisites**
```bash
# Install Google Cloud CLI (macOS)
brew install google-cloud-sdk

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project quantum-conduit-483508-c0
```

#### **Step 1: Prepare Your Configuration**

Your deployment script (`deploy-backend.sh`) should have these values:

```bash
#!/bin/bash

# Google Cloud Configuration
PROJECT_ID="quantum-conduit-483508-c0"
REGION="us-central1"
SERVICE_NAME="rental-management-api"

# Database Configuration (from Supabase)
DATABASE_URL="your-supabase-transaction-pooler-connection-string"

# JWT Secret (Generate a secure key)
JWT_SECRET_KEY="$(openssl rand -base64 32)"

# Frontend URL (Will update after deploying frontend)
FRONTEND_URL="https://your-frontend-url.netlify.app"
```

#### **Step 2: Deploy Backend**

```bash
# Navigate to project root
cd /Users/dungvt/Projects/rental-management-system

# Make script executable
chmod +x deploy-backend.sh

# Run deployment
./deploy-backend.sh
```

**What happens during deployment:**
1. ✅ Builds Docker image from your .NET 8 API
2. ✅ Pushes image to Google Container Registry
3. ✅ Deploys to Cloud Run with environment variables
4. ✅ Configures CORS, memory, CPU, and timeout settings
5. ✅ Outputs your API URL

**Expected Output:**
```
✅ Backend deployed successfully!

API URL: https://rental-management-api-lfgedmy2ua-uc.a.run.app
Swagger: https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger
```

#### **Step 3: Test Backend API**

```bash
# Test health check
curl https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger

# Test login endpoint
curl -X POST https://rental-management-api-lfgedmy2ua-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalmanagement.com","password":"Admin123!"}'
```

---

## 🎨 FRONTEND DEPLOYMENT - Step by Step

### **Prerequisites**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login
```

### **Step 1: Build Frontend**

```bash
# Navigate to frontend directory
cd /Users/dungvt/Projects/rental-management-system/RentalManagementSystem/Frontend

# Install dependencies
npm install

# Build for production
npm run build
```

**Expected Output:**
```
✓ 2301 modules transformed.
dist/index.html                   0.47 kB │ gzip:   0.31 kB
dist/assets/index-gh9kAUHO.css   60.45 kB │ gzip:  10.53 kB
dist/assets/index-RIHcJYIm.js   847.82 kB │ gzip: 232.59 kB
✓ built in 1.91s
```

### **Step 2: Deploy to Netlify**

```bash
# Deploy to production
netlify deploy --prod --dir=dist
```

**During deployment:**
1. ✅ Uploads all build files to Netlify CDN
2. ✅ Configures automatic HTTPS
3. ✅ Sets up continuous deployment from Git (if connected)

**Expected Output:**
```
✔ Deploy is live!

Production URL: https://candid-beijinho-543419.netlify.app
```

### **Step 3: Configure Environment Variables in Netlify**

**Option A: Via Netlify Dashboard (Recommended)**

1. Go to: https://app.netlify.com/projects/candid-beijinho-543419/configuration/env
2. Click **"Add a variable"**
3. Add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`
   - **Scopes**: Production ✅
4. Click **"Save"**
5. Go to **Deploys** → **Trigger deploy** → **Deploy site**

**Option B: Via Netlify CLI**

```bash
# Set environment variable
netlify env:set VITE_API_BASE_URL "https://rental-management-api-lfgedmy2ua-uc.a.run.app/api"

# Trigger redeploy
netlify deploy --prod --dir=dist
```

### **Step 4: Update Backend CORS**

Your backend needs to accept requests from your Netlify domain:

```bash
# Navigate to project root
cd /Users/dungvt/Projects/rental-management-system

# Run CORS update script
./update-backend-cors.sh
```

**When prompted, enter:**
```
https://candid-beijinho-543419.netlify.app
```

**Press Enter, then type** `done` **and press Enter again**

**Expected Output:**
```
✅ CORS configuration updated successfully!

Allowed Origins:
  - https://candid-beijinho-543419.netlify.app
  - http://localhost:3000
  - http://localhost:5173
```

---

## 🧪 TESTING YOUR DEPLOYMENT

### **1. Test Backend Directly**

```bash
# Open Swagger UI in browser
open https://rental-management-api-lfgedmy2ua-uc.a.run.app/swagger

# Or test with curl
curl -X POST https://rental-management-api-lfgedmy2ua-uc.a.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalmanagement.com","password":"Admin123!"}'
```

### **2. Test Frontend**

1. Open: https://candid-beijinho-543419.netlify.app
2. Try to login with:
   - **Email**: admin@rentalmanagement.com
   - **Password**: Admin123!

### **3. Check Browser Console**

Open Developer Tools (F12) and check:
- **Console**: No CORS errors
- **Network**: API calls should return 200 status
- **Application**: JWT token stored in localStorage

---

## 🔄 UPDATING YOUR DEPLOYMENT

### **Update Backend**

```bash
# Navigate to project root
cd /Users/dungvt/Projects/rental-management-system

# Make changes to your code, then redeploy
./deploy-backend.sh
```

### **Update Frontend**

```bash
# Navigate to frontend
cd RentalManagementSystem/Frontend

# Make changes, then rebuild and redeploy
npm run build
netlify deploy --prod --dir=dist
```

---

## 📊 MONITORING & LOGS

### **Backend Logs (Google Cloud Run)**

```bash
# View recent logs
gcloud run services logs read rental-management-api \
  --region us-central1 \
  --limit 50

# Stream live logs
gcloud run services logs tail rental-management-api \
  --region us-central1
```

### **Backend Logs (Render)**

```bash
# View logs in Render dashboard
# Navigate to: https://dashboard.render.com
```

### **Frontend Logs (Netlify)**

```bash
# View deploy logs
netlify logs:deploy

# View function logs (if using serverless functions)
netlify logs:function
```

**Or view in dashboard:**
- https://app.netlify.com/projects/candid-beijinho-543419/deploys

### **Database Monitoring (Supabase)**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Database** → **Reports**
4. Monitor:
   - Active connections
   - Query performance
   - Disk usage

---

## 🔐 SECURITY CHECKLIST

- [x] JWT secret is randomly generated (not default)
- [x] HTTPS enabled on all services (automatic)
- [x] CORS configured properly
- [x] Database uses connection pooling (Supabase Transaction mode)
- [ ] Change default admin password after first login
- [ ] Set up monitoring alerts
- [ ] Configure rate limiting
- [ ] Regular database backups
- [ ] Review and rotate secrets every 90 days

---

## 💰 COST ESTIMATES

| Service | Free Tier | Expected Monthly Cost |
|---------|-----------|----------------------|
| **Google Cloud Run** | 2M requests, 360k GB-seconds | $0-5 (low traffic) |
| **Render** | 750 hours/month | $0 (within limits) |
| **Netlify** | 100 GB bandwidth, 300 build minutes | $0 (within limits) |
| **Supabase** | 500 MB database, 2 GB bandwidth | $0 (within limits) |
| **Total** | | **$0-10/month** |

---

## 🚨 TROUBLESHOOTING

### **Problem: CORS Errors in Browser**

**Symptoms:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
```bash
# Update backend CORS configuration
cd /Users/dungvt/Projects/rental-management-system
./update-backend-cors.sh

# Enter your Netlify URL when prompted:
# https://candid-beijinho-543419.netlify.app
```

### **Problem: Frontend Can't Connect to API**

**Check:**
1. Environment variable is set in Netlify:
   - Go to: https://app.netlify.com/projects/candid-beijinho-543419/configuration/env
   - Verify `VITE_API_BASE_URL` exists
   - Value should be: `https://rental-management-api-lfgedmy2ua-uc.a.run.app/api`

2. Trigger a redeploy after adding environment variable

**Solution:**
```bash
# Redeploy frontend with correct environment variable
cd RentalManagementSystem/Frontend
netlify deploy --prod --dir=dist
```

### **Problem: Backend Returns 500 Errors**

**Check Logs:**
```bash
gcloud run services logs read rental-management-api \
  --region us-central1 \
  --limit 100
```

**Common Issues:**
- Database connection string is incorrect
- Database migrations not applied
- JWT secret not configured

### **Problem: Database Connection Fails**

**Verify:**
1. Using **Transaction** pooler (not Session)
2. Connection string format:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
3. Password is correct (check Supabase dashboard)

**Test Connection:**
```bash
# Set connection string
export DATABASE_URL="your-connection-string"

# Test locally
cd RentalManagementSystem/Backend/RentalManagement.Api
dotnet run
```

---

## 📝 DEPLOYMENT SCRIPTS REFERENCE

### **deploy-backend.sh**
```bash
# Deploy backend to Google Cloud Run
./deploy-backend.sh
```

### **deploy-render.sh**
```bash
# Deploy backend to Render
./deploy-render.sh
```

### **deploy-frontend-netlify.sh**
```bash
# Interactive deployment with options
./deploy-frontend-netlify.sh
```

### **update-backend-cors.sh**
```bash
# Update CORS configuration
./update-backend-cors.sh
```

### **generate-jwt-secret.sh**
```bash
# Generate a secure JWT secret
./generate-jwt-secret.sh
```

---

## 🎯 PRODUCTION CHECKLIST

### **Before Going Live**

- [x] Backend deployed to Cloud Run or Render
- [x] Frontend deployed to Netlify
- [x] Database on Supabase (Transaction pooler)
- [ ] Environment variables configured in Netlify
- [ ] CORS updated with Netlify URL
- [ ] Test login/logout functionality
- [ ] Test all major features
- [ ] Change default admin password
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring alerts
- [ ] Set up automated backups
- [ ] Review security settings
- [ ] Document deployment process for team

### **After Going Live**

- [ ] Monitor error logs daily (first week)
- [ ] Check performance metrics
- [ ] Verify database connection pooling
- [ ] Test from different locations/devices
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Plan for scaling if needed
- [ ] Schedule regular security audits

---

## 📞 USEFUL LINKS

### **Your Deployment URLs**
- **Frontend (Netlify)**: https://candid-beijinho-543419.netlify.app
- **Backend (Cloud Run)**: https://rental-management-api-lfgedmy2ua-uc.a.run.app
- **Backend (Render)**: https://your-render-service.onrender.com
- **Swagger Docs**: Available on both backend URLs + `/swagger`

### **Dashboards**
- **Netlify**: https://app.netlify.com/sites/rental-management-fresh-2026
- **Google Cloud**: https://console.cloud.google.com/run?project=quantum-conduit-483508-c0
- **Render**: https://dashboard.render.com
- **Supabase**: https://supabase.com/dashboard

### **Documentation**
- **Render**: https://render.com/docs
- **Supabase**: https://supabase.com/docs
- **Google Cloud Run**: https://cloud.google.com/run/docs
- **Netlify**: https://docs.netlify.com

---

## 🎯 RECOMMENDED DEPLOYMENT PATH

### **For Learning/Portfolio Projects**
```
1. Start with: Render + Netlify
2. Pros: Simple, free, Git-based
3. Cons: Cold starts, usage limits
```

### **For Production Applications**
```
1. Start with: Google Cloud Run + Netlify
2. Pros: Fast, scalable, enterprise-grade
3. Cons: More complex, potential costs
```

### **Hybrid Approach**
```
1. Development: Render (simple, free)
2. Staging: Render (cost-effective testing)
3. Production: Google Cloud Run (performance, reliability)
```

---

**Happy Deploying! 🎉**

**Last Updated**: January 12, 2026  
**New**: Render deployment option added  
**Status**: ✅ Multiple deployment options available
