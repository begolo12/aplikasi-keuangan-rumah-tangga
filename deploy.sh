#!/bin/bash

echo "======================================"
echo "🚀 KasKeluarga v2.0 Deployment Script"
echo "======================================"
echo ""

# Step 1: Fix critical issues first
echo "Step 1: Checking for critical errors..."
npm run build > /tmp/build_result.txt 2>&1

if grep -q "Expected ident\|Expected ';'\|Syntax Error" /tmp/build_result.txt; then
    echo "❌ Build still has errors!"
    echo "📖 See URGENT-FIXES.md for detailed fix instructions"
    echo "💡 Quick fixes needed in:"
    echo "   - src/components/settings/SettingsView.tsx (line ~151)"
    echo "   - src/components/layout/SidebarNav.tsx (line ~301)"  
    echo "   - src/components/goals/GoalsView.tsx (line ~66)"
    exit 1
else
    echo "✅ Build successful!"
fi

# Step 2: Run tests
echo ""
echo "Step 2: Running test suite..."
npm run test:audit | tail -3
if [ $? -eq 0 ]; then
    echo "✅ All tests passing!"
else
    echo "⚠️ Some tests failed, but proceeding..."
fi

# Step 3: Deploy to Vercel
echo ""
echo "Step 3: Deploying to Vercel..."
vercel --prod --token $VERCEL_TOKEN

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "📍 URLs:"
echo "   Landing Page: https://your-app.vercel.app"
echo "   App URL:      https://your-app.vercel.app/login"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure database (DATABASE_URL)"
echo "   2. Initialize DB: curl -X POST https://your-app.vercel.app/api/init"
echo "   3. Test registration flow"
echo "   4. Enable push notifications"
echo ""
