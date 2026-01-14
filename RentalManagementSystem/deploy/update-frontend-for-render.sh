#!/bin/bash

# Update Frontend to use Render Backend
# This script updates your Netlify frontend to connect to the Render backend

set -e

echo "🔄 Updating Frontend Configuration for Render Backend..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get the Render URL from user or use default
RENDER_URL="${1:-https://rental-management-api.onrender.com}"

echo "🔗 Backend URL: $RENDER_URL"
echo ""

# Find and update API configuration files
FRONTEND_DIR="RentalManagementSystem/Frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

echo "🔍 Searching for API configuration files..."

# Common API configuration file patterns
CONFIG_FILES=(
    "$FRONTEND_DIR/src/config/api.ts"
    "$FRONTEND_DIR/src/config/config.ts"
    "$FRONTEND_DIR/src/services/api.ts"
    "$FRONTEND_DIR/src/utils/api.ts"
    "$FRONTEND_DIR/src/config/environment.ts"
    "$FRONTEND_DIR/.env"
    "$FRONTEND_DIR/.env.production"
)

UPDATED_FILES=0

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        echo "📝 Updating: $config_file"
        
        # Create backup
        cp "$config_file" "${config_file}.backup"
        
        # Update URLs (handle various formats)
        sed -i.tmp \
            -e "s|https://rental-management-api-[^.]*\.us-central1\.run\.app|$RENDER_URL|g" \
            -e "s|https://rental-management-api-[^.]*\.onrender\.com|$RENDER_URL|g" \
            -e "s|http://localhost:8080|$RENDER_URL|g" \
            -e "s|http://localhost:5000|$RENDER_URL|g" \
            -e "s|VITE_API_URL=.*|VITE_API_URL=$RENDER_URL|g" \
            -e "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$RENDER_URL|g" \
            "$config_file"
        
        rm "${config_file}.tmp" 2>/dev/null || true
        UPDATED_FILES=$((UPDATED_FILES + 1))
        print_status "Updated $config_file"
    fi
done

if [ $UPDATED_FILES -eq 0 ]; then
    print_warning "No configuration files found. You may need to manually update your API URL."
    echo ""
    echo "Common places to update:"
    echo "• Environment variables (.env files)"
    echo "• API service files"
    echo "• Configuration files"
    echo "• Build environment variables in Netlify dashboard"
    echo ""
fi

# Check if we need to rebuild and redeploy frontend
if [ $UPDATED_FILES -gt 0 ]; then
    echo ""
    echo "🚀 Next Steps:"
    echo ""
    echo "1. Review the changes:"
    for config_file in "${CONFIG_FILES[@]}"; do
        if [ -f "$config_file" ]; then
            echo "   git diff $config_file"
        fi
    done
    echo ""
    echo "2. Test locally (optional):"
    echo "   cd $FRONTEND_DIR"
    echo "   npm run dev"
    echo ""
    echo "3. Deploy to Netlify:"
    echo "   git add ."
    echo "   git commit -m 'Update API URL for Render backend'"
    echo "   git push origin main"
    echo ""
    echo "4. Or use the deployment script:"
    echo "   ./deploy-frontend-netlify.sh"
    echo ""
fi

# Netlify environment variables instructions
echo "🔧 Netlify Environment Variables:"
echo ""
echo "If your frontend uses environment variables, update them in Netlify:"
echo "1. Go to https://app.netlify.com → Your Site → Site Settings → Environment Variables"
echo "2. Update/Add these variables:"
echo "   - VITE_API_URL=$RENDER_URL"
echo "   - REACT_APP_API_URL=$RENDER_URL (if using Create React App)"
echo "3. Trigger a new deploy"
echo ""

print_status "Frontend update process completed!"
echo ""
echo "📋 Summary:"
echo "• Backend will be deployed to: $RENDER_URL"
echo "• Frontend is deployed at: https://rental-management-fresh-2026.netlify.app"
echo "• Updated $UPDATED_FILES configuration file(s)"
echo ""
echo "⚠️  Important:"
echo "• Test your API health check: $RENDER_URL/api/health"
echo "• Test authentication: $RENDER_URL/api/auth/login"
echo "• Monitor cold starts (can take up to 1 minute)"
echo ""