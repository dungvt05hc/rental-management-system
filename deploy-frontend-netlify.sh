#!/bin/bash

echo "🎨 Deploying Frontend to Netlify..."
echo ""

# Check if netlify-cli is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Navigate to frontend directory
cd RentalManagementSystem/Frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
echo ""
echo "Choose deployment method:"
echo "1. Deploy via Netlify CLI (requires login)"
echo "2. Deploy via Git (manual - will show instructions)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Check if logged in
    if ! netlify status &> /dev/null; then
        echo "🔐 Please login to Netlify..."
        netlify login
    fi
    
    echo ""
    echo "📤 Deploying to production..."
    netlify deploy --prod --dir=dist
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Deployment successful!"
        echo ""
        echo "🔗 Your site is live! Check the URL above."
        echo ""
        echo "⚙️  Don't forget to add environment variable in Netlify dashboard:"
        echo "   - Go to Site settings → Environment variables"
        echo "   - Add: VITE_API_BASE_URL = https://rental-management-api-352003018892.us-central1.run.app/api"
        echo ""
        echo "📝 Next steps:"
        echo "1. Copy your Netlify URL from above"
        echo "2. Update backend CORS settings with this URL"
        echo "3. Add environment variable in Netlify dashboard"
        echo "4. Trigger a redeploy in Netlify"
        echo "5. Test your application"
    fi
else
    echo ""
    echo "📋 Manual Deployment Instructions (via Git):"
    echo ""
    echo "1. Push your code to GitHub (if not already done)"
    echo "2. Go to https://app.netlify.com"
    echo "3. Click 'Add new site' → 'Import an existing project'"
    echo "4. Connect your GitHub repository"
    echo "5. Configure build settings:"
    echo "   - Base directory: RentalManagementSystem/Frontend"
    echo "   - Build command: npm run build"
    echo "   - Publish directory: dist"
    echo "6. Add environment variable:"
    echo "   - Key: VITE_API_BASE_URL"
    echo "   - Value: https://rental-management-api-352003018892.us-central1.run.app/api"
    echo "7. Click 'Deploy site'"
    echo ""
    echo "Your dist folder is ready at: $(pwd)/dist"
fi
