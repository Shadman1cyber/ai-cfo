#!/usr/bin/env bash
# ai-financial-analyst Local Setup Script
# One-command setup for friends to run the app locally (including on phone)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🔧 ai-financial-analyst Setup"
echo "===================================="

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "⚠️  Node.js 20+ recommended (you have v$NODE_VERSION)"
fi

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install --quiet 2>&1 | head -1
echo "   ✅ Dependencies installed"

# Step 2: Generate .env if needed
if [ ! -f .env ]; then
  echo "📝 Creating .env from .envexample..."
  cp .env.example .env
  echo "   ⚠️  .env created - you'll need to fill in your API keys"
fi

# Step 3: Generate NEXTAUTH_SECRET if placeholder
NEXTAUTH_SECRET=$(grep '^NEXTAUTH_SECRET=' .env | cut -d'=' -f2- | tr -d '"')
if [[ "$NEXTAUTH_SECRET" == "your-super-secret-key-change-in-production-min-32-chars" || "$NEXTAUTH_SECRET" == "your-super-secret-key-min-32-chars" ]]; then
  echo "🔐 Generating secure NEXTAUTH_SECRET..."
  NEW_SECRET=$(openssl rand -base64 32)
  sed -i "s/^NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEW_SECRET\"/" .env
  echo "   ✅ Generated: $NEW_SECRET"
fi

# Step 4: Prisma setup
echo "🗄️  Setting up Prisma..."
npm run db:generate 2>&1 | tail -1

echo ""
echo "📋 You need a PostgreSQL database. Options:"
echo "   1. Local PostgreSQL (running on port 5432)"
echo "   2. Neon (free tier: neon.tech)"
echo "   3. Supabase (free tier: supabase.com)"
echo ""
read -p "Enter DATABASE_URL (or press Enter to skip DB setup): " DB_URL

if [ -n "$DB_URL" ]; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
  echo "🗄️  Running db push..."
  npm run db:push 2>&1 | tail -3
fi

# Step 5: Check for Zhipu AI key
ZHIPU_KEY=$(grep '^ZHIPU_API_KEY=' .env | cut -d'=' -f2- | tr -d '"')
if [ -z "$ZHIPU_KEY" ] || [[ "$ZHIPU_KEY" == "your-zhipu-api-key" ]]; then
  echo ""
  echo "⚠️  Zhipu AI key not configured in .env"
  echo "   Get free key from: https://bigmodel.cn"
  echo "   Without this, AI categorization won't work (fallback keywords only)"
fi

echo ""
echo "===================================="
echo "✅ Setup Complete!"
echo ""

# Get local IP address
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ip addr | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1)
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="localhost"
fi

echo "🚀 Starting development server (accessible from phone on your network)..."
echo ""
echo "   Local:    http://localhost:3000"
echo "   Network:  http://$LOCAL_IP:3000"
echo ""
echo "📱 To open on your phone, visit: http://$LOCAL_IP:3000"
echo ""
echo "⚠️  If on Wi-Fi and can't connect, try:"
echo "   - Make sure phone and computer are on same network"
echo "   - Allow firewall access to port 3000"
echo ""
echo "Press Ctrl+C to stop the server"

# Start Next.js dev server accessible from network
export HOST=0.0.0.0
npm run dev