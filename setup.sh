#!/usr/bin/env bash
set -e

echo "🔧 ai-financial-analyst Setup Script"
echo "===================================="

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Generate .env if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your actual values!"
fi

# Step 3: Generate NEXTAUTH_SECRET if placeholder
NEXTAUTH_SECRET=$(grep 'NEXTAUTH_SECRET' .env | cut -d'"' -f2)
if [[ "$NEXTAUTH_SECRET" == "your-super-secret-key-change-in-production-min-32-chars" || "$NEXTAUTH_SECRET" == "your-super-secret-key-min-32-chars" ]]; then
  echo "🔐 Generating NEXTAUTH_SECRET..."
  NEW_SECRET=$(openssl rand -base64 32)
  sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEW_SECRET\"/" .env
  echo "   Generated: $NEW_SECRET"
fi

# Step 4: Prisma setup
echo "🗄️  Setting up database..."
npm run db:generate

echo ""
echo "📋 Please ensure you have:"
echo "   1. PostgreSQL running (local or Neon/Supabase)"
echo "   2. Zhipu AI API Key from https://bigmodel.cn"
echo "   3. Supabase account (optional, for receipt storage)"
echo ""
echo "Edit .env with your values, then run:"
echo "  npm run db:migrate    # or: npm run db:push"
echo ""
echo "▶️  Start development server:"
echo "  npm run dev"
echo ""
echo "🌐 Open http://localhost:3000"