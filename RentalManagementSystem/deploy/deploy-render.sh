#!/bin/bash

# Render Deployment Script for Rental Management API
# This script helps deploy your .NET 9 backend to Render

set -e

echo "🚀 Deploying Rental Management API to Render..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    print_error "render.yaml not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    print_warning "Render CLI not found. Installing..."
    if command -v npm &> /dev/null; then
        npm install -g @render-com/cli
    elif command -v yarn &> /dev/null; then
        yarn global add @render-com/cli
    else
        print_error "Neither npm nor yarn found. Please install Node.js first."
        exit 1
    fi
fi

print_status "Render CLI is available"

# Validate environment variables
echo "🔧 Validating configuration..."

if [ -z "$RENDER_API_KEY" ]; then
    print_warning "RENDER_API_KEY not set. You'll need to authenticate manually."
    echo "Please set your Render API key:"
    echo "export RENDER_API_KEY=your_api_key_here"
    echo ""
    echo "Get your API key from: https://dashboard.render.com/account/api-keys"
    echo ""
fi

# Build and test locally first
echo "🏗️  Building project locally..."
cd RentalManagementSystem/Backend/RentalManagement.Api

if ! dotnet build -c Release; then
    print_error "Local build failed. Please fix build errors before deploying."
    exit 1
fi

print_status "Local build successful"

# Return to project root
cd ../../..

# Deploy to Render
echo "☁️  Deploying to Render..."
echo ""

if [ -n "$RENDER_API_KEY" ]; then
    # Deploy using API key
    render auth login --api-key "$RENDER_API_KEY"
    render deploy --service rental-management-api
else
    # Manual deployment instructions
    print_warning "Manual deployment required:"
    echo ""
    echo "1. Go to https://dashboard.render.com"
    echo "2. Click 'New +' → 'Web Service'"
    echo "3. Connect your Git repository"
    echo "4. Use these settings:"
    echo "   - Name: rental-management-api"
    echo "   - Runtime: Docker"
    echo "   - Build Command: (leave empty - using Dockerfile)"
    echo "   - Start Command: (leave empty - using Dockerfile)"
    echo "   - Plan: Free"
    echo "   - Region: Oregon (or your preferred free region)"
    echo ""
    echo "5. Add Environment Variables:"
    echo "   - ASPNETCORE_ENVIRONMENT=Production"
    echo "   - DATABASE_URL=Host=db.fpvgtejnkxkushmzkstu.dungtest3.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=qijfiw-qetqof-paJmo4;SSL Mode=Require;Trust Server Certificate=true"
    echo "   - JWT_SECRET_KEY=Nw6OuBAYTsjMpAvDW1r7xo62KAa8/7eTjS/+a9jO0h4="
    echo "   - FRONTEND_URL=https://rental-management-fresh-2026.netlify.app"
    echo ""
    echo "6. Set Docker context to: RentalManagementSystem/Backend/RentalManagement.Api"
    echo "7. Click 'Create Web Service'"
    echo ""
fi

echo ""
print_status "Deployment process initiated!"
echo ""
echo "📋 Important Notes:"
echo "• Free plan: 750 hours/month across workspace"
echo "• Spins down after 15 minutes of inactivity"
echo "• Cold start can take up to 1 minute"
echo "• Health check endpoint: /api/health"
echo ""
echo "🔗 After deployment:"
echo "• Your API will be available at: https://rental-management-api.onrender.com"
echo "• Update your frontend to use the new backend URL"
echo "• Test the health endpoint first: https://rental-management-api.onrender.com/api/health"
echo ""
echo "🛠️  Troubleshooting:"
echo "• Check logs: https://dashboard.render.com → Your Service → Logs"
echo "• Monitor deployments: https://dashboard.render.com → Your Service → Events"
echo ""