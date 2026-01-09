#!/bin/bash

# Configuration - UPDATE THESE VALUES
PROJECT_ID="quantum-conduit-483508-c0"
REGION="us-central1"  # Change to your preferred region
SERVICE_NAME="rental-management-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Supabase Database Connection String (Direct Connection - Session Mode)
# Using direct connection (port 5432) instead of transaction pooler for better reliability with EF Core
DATABASE_URL="Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"

# JWT Secret Key (generate a secure random string)
JWT_SECRET_KEY="Nw6OuBAYTsjMpAvDW1r7xo62KAa8/7eTjS/+a9jO0h4="

# Frontend URL (update after deploying frontend)
FRONTEND_URL="https://your-frontend-url.netlify.app"

echo "🚀 Deploying Rental Management API to Google Cloud Run..."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it with: brew install google-cloud-sdk"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Error: Not logged into gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

# Verify environment variables are set
if [ "$DATABASE_URL" = "your-supabase-transaction-pooler-connection-string" ]; then
    echo "❌ Error: Please update DATABASE_URL in the script"
    exit 1
fi

if [ "$JWT_SECRET_KEY" = "your-secure-jwt-secret-key-at-least-32-characters-long" ]; then
    echo "❌ Error: Please update JWT_SECRET_KEY in the script"
    echo "Run: ./generate-jwt-secret.sh to generate one"
    exit 1
fi

# Enable required APIs
echo "📋 Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com --project=${PROJECT_ID}
gcloud services enable cloudbuild.googleapis.com --project=${PROJECT_ID}
gcloud services enable containerregistry.googleapis.com --project=${PROJECT_ID}

# Build using Cloud Build with custom configuration
echo "📦 Building Docker image with Cloud Build..."
cd RentalManagementSystem/Backend

gcloud builds submit \
  --config cloudbuild.yaml \
  --project ${PROJECT_ID} \
  --timeout=20m \
  .

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Production,DATABASE_URL=${DATABASE_URL},JWT_SECRET_KEY=${JWT_SECRET_KEY},FRONTEND_URL=${FRONTEND_URL}" \
  --max-instances 10 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --port 8080

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your API URL:"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'

echo ""
echo "📊 View logs:"
echo "gcloud run services logs read ${SERVICE_NAME} --region ${REGION} --limit 50"
echo ""
echo "🔧 Next steps:"
echo "1. Test your API at: https://[YOUR-API-URL]/swagger"
echo "2. Update FRONTEND_URL in the script after deploying frontend"
echo "3. Redeploy with updated CORS settings"
echo ""
echo "ℹ️  Note: Using direct database connection (port 5432) for better reliability with Entity Framework"
