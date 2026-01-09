#!/bin/bash

echo "🔄 Updating Backend CORS Settings..."
echo ""

# Configuration
PROJECT_ID="quantum-conduit-483508-c0"
REGION="us-central1"
SERVICE_NAME="rental-management-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Database and JWT settings (keep the same)
DATABASE_URL="Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"
JWT_SECRET_KEY="Nw6OuBAYTsjMpAvDW1r7xo62KAa8/7eTjS/+a9jO0h4="

# Prompt for frontend URLs
echo "Enter your frontend URLs (one per line, press Enter when done):"
echo "Example: https://your-app.netlify.app"
echo ""

FRONTEND_URLS=()
while true; do
    read -p "Frontend URL (or press Enter to finish): " url
    if [ -z "$url" ]; then
        break
    fi
    FRONTEND_URLS+=("$url")
done

if [ ${#FRONTEND_URLS[@]} -eq 0 ]; then
    echo "❌ No frontend URLs provided!"
    exit 1
fi

# Join URLs with comma
FRONTEND_URL=$(IFS=,; echo "${FRONTEND_URLS[*]}")

echo ""
echo "📝 Frontend URLs to allow:"
for url in "${FRONTEND_URLS[@]}"; do
    echo "  - $url"
done
echo ""

read -p "Deploy with these settings? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "☁️  Updating Cloud Run service..."

# Use proper quoting for environment variables with special characters
gcloud run services update ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Production" \
  --update-env-vars "DATABASE_URL=${DATABASE_URL}" \
  --update-env-vars "JWT_SECRET_KEY=${JWT_SECRET_KEY}" \
  --update-env-vars "FRONTEND_URL=${FRONTEND_URL}"

if [ $? -ne 0 ]; then
    echo "❌ Update failed!"
    exit 1
fi

echo ""
echo "✅ CORS settings updated successfully!"
echo ""
echo "🔗 Your API URL:"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'

echo ""
echo "✅ Backend is now configured to accept requests from:"
for url in "${FRONTEND_URLS[@]}"; do
    echo "  ✓ $url"
done
