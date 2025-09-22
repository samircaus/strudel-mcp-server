#!/bin/bash

echo "🚀 Setting up Strudel MCP Server for Cloudflare Workers deployment"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found"
fi

# Check if user is logged in
echo "🔍 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare..."
    wrangler login
else
    echo "✅ Already authenticated with Cloudflare"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# No KV namespace needed - patterns stored client-side
echo "✅ No server-side storage required"

# Build the project
echo "🔨 Building the project..."
npm run build:worker

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Deploy with: npm run deploy"
echo "2. Test with your deployed URL"