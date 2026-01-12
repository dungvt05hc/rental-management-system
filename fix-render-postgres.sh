#!/bin/bash

# Fix Render PostgreSQL Connection Script
# This script helps you update your Render service with the correct Supabase connection pooler

set -e

echo "🔧 Fixing Render PostgreSQL Connection..."
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

echo "🔍 Issue Analysis:"
echo "• Your Render service is trying to connect via IPv6"
echo "• This causes 'Network is unreachable' errors"
echo "• Solution: Use Supabase Connection Pooler (IPv4 compatible)"
echo ""

echo "🔧 Fixed Connection String:"
echo "OLD: Host=db.fpvgtejnkxkushmzkstu.supabase.co;Port=5432;..."
echo "NEW: postgresql://postgres.fpvgtejnkxkushmzkstu:qijfiw-qetqof-paJmo4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
echo ""

print_warning "Manual Steps Required:"
echo ""
echo "1. Go to your Render Dashboard:"
echo "   https://dashboard.render.com"
echo ""
echo "2. Find your service: rental-management-api"
echo ""
echo "3. Go to Environment tab"
echo ""
echo "4. Update the DATABASE_URL variable:"
echo "   postgresql://postgres.fpvgtejnkxkushmzkstu:qijfiw-qetqof-paJmo4@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
echo ""
echo "5. Click 'Save Changes'"
echo ""
echo "6. Render will automatically redeploy your service"
echo ""

print_status "Expected Results After Fix:"
echo "• No more IPv6 connection errors"
echo "• Database migrations will complete successfully"
echo "• Health check will return 200 OK"
echo "• Authentication endpoints will work"
echo ""

echo "🧪 Test After Fix:"
echo "curl https://your-render-service.onrender.com/api/health"
echo ""

print_warning "Alternative: Redeploy with Git Push"
echo ""
echo "If you have the render.yaml file updated:"
echo "1. Commit your changes:"
echo "   git add ."
echo "   git commit -m 'Fix PostgreSQL connection for Render'"
echo "   git push origin main"
echo ""
echo "2. Render will auto-deploy with new configuration"
echo ""

echo "📋 Connection Details:"
echo "• Protocol: PostgreSQL (not Host format)"
echo "• Server: aws-0-ap-southeast-1.pooler.supabase.com"
echo "• Port: 6543 (Connection Pooler, not direct 5432)"
echo "• Database: postgres"
echo "• SSL: Enabled by default"
echo ""

print_status "Script completed! Follow the manual steps above to fix the connection."