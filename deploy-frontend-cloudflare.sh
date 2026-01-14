#!/bin/bash

echo "🎨 Deploying Frontend to Cloudflare Pages..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
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

# Deploy to Cloudflare Pages
echo "🚀 Deploying to Cloudflare Pages..."
echo ""
echo "Choose deployment method:"
echo "1. Deploy via Wrangler CLI (requires login)"
echo "2. Deploy via Git (manual - will show instructions)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Check if logged in
    if ! wrangler whoami &> /dev/null; then
        echo "🔐 Please login to Cloudflare..."
        wrangler login
    fi
    
    echo ""
    echo "📤 Deploying to Cloudflare Pages..."
    wrangler pages deploy dist --project-name rental-management --branch main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Deployment successful!"
        echo ""
        echo "🔗 Your site is live! Check the URL above."
        echo ""
        echo "⚙️  Don't forget to add environment variable in Cloudflare dashboard:"
        echo "   - Go to your Pages project → Settings → Environment variables"
        echo "   - Add: VITE_API_BASE_URL = https://rental-management-api-281m.onrender.com/api"
        echo ""
        echo "📝 Next steps:"
        echo "1. Copy your Cloudflare Pages URL"
        echo "2. Update backend CORS settings with this URL"
        echo "3. Test your application"
    fi
else
    echo ""
    echo "📋 Manual Deployment Instructions (via Git):"
    echo ""
    echo "1. Push your code to GitHub (if not already done)"
    echo "2. Go to https://dash.cloudflare.com"
    echo "3. Navigate to 'Workers & Pages' → 'Create application' → 'Pages'"
    echo "4. Connect your GitHub repository"
    echo "5. Configure build settings:"
    echo "   - Framework preset: Vite"
    echo "   - Build command: npm run build"
    echo "   - Build output directory: dist"
    echo "   - Root directory: RentalManagementSystem/Frontend"
    echo "6. Add environment variable:"
    echo "   - VITE_API_BASE_URL = https://rental-management-api-281m.onrender.com/api"
    echo "7. Click 'Save and Deploy'"
    echo ""
    echo "Your dist folder is ready at: $(pwd)/dist"
fi
