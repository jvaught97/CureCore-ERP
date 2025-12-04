#!/bin/bash

# Admin Settings Migrations - Apply Script
# This script applies the admin settings migrations to your Supabase database

set -e  # Exit on error

echo "=========================================="
echo "CureCore ERP - Admin Settings Migrations"
echo "=========================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed."
    echo "Install PostgreSQL client:"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Get database connection string
echo "📋 Please provide your Supabase database connection string."
echo "   Find it in: Supabase Dashboard → Settings → Database → Connection String (Direct connection)"
echo "   Format: postgresql://postgres:[YOUR-PASSWORD]@db.retcdlmdyvjetdjiwfgx.supabase.co:5432/postgres"
echo ""
read -p "Database URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: Database URL is required"
    exit 1
fi

echo ""
echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database. Please check your connection string."
    exit 1
fi
echo "✅ Database connection successful"
echo ""

# Apply main migration
echo "📦 Applying admin settings schema migration..."
if psql "$DATABASE_URL" -f supabase/migrations/20250105_admin_settings.sql > /tmp/migration_output.txt 2>&1; then
    echo "✅ Schema migration applied successfully"
else
    echo "❌ Error applying schema migration. Output:"
    cat /tmp/migration_output.txt
    exit 1
fi

echo ""
read -p "Would you like to apply seed data (demo tenant)? (y/n): " APPLY_SEED

if [ "$APPLY_SEED" = "y" ] || [ "$APPLY_SEED" = "Y" ]; then
    echo "📦 Applying seed data..."
    if psql "$DATABASE_URL" -f supabase/migrations/20250105_admin_settings_seed.sql > /tmp/seed_output.txt 2>&1; then
        echo "✅ Seed data applied successfully"
    else
        echo "⚠️  Warning: Seed data may have already been applied or encountered an error:"
        cat /tmp/seed_output.txt
    fi
fi

echo ""
echo "=========================================="
echo "✅ Migrations Applied Successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Navigate to your app: http://localhost:3000/settings/organization"
echo "2. Login as an admin user"
echo "3. You should see the new settings interface"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: ADMIN_SETTINGS_README.md"
echo "   - Implementation Guide: SETTINGS_IMPLEMENTATION_GUIDE.md"
echo "   - Deployment Checklist: DEPLOYMENT_CHECKLIST.md"
echo ""
