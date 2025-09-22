# Cloudflare Workers Deployment Guide

Deploy your Strudel MCP Server to Cloudflare Workers for global access.

## Quick Setup

```bash
# Automated setup
./setup-cloudflare.sh

# Deploy
npm run deploy
```

## Manual Setup

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Build and Deploy
No additional setup needed - the server focuses on pattern generation only.

```bash
npm run build:worker
npm run deploy
```

## Your Deployed Server

After deployment, your MCP server will be available at:
- **MCP Endpoint**: `https://strudel-mcp-server.your-account.workers.dev/sse`
- **Health Check**: `https://strudel-mcp-server.your-account.workers.dev/health`

## Available Tools

The Cloudflare Workers version includes:
- `generate_pattern` - Generate complete patterns
- `generate_drums` - Generate drum patterns  
- `generate_bassline` - Generate basslines
- `generate_melody` - Generate melodies
- `generate_scale` - Generate scale notes

**Note**: Pattern storage is handled client-side for better privacy and cost efficiency.

## Usage with Claude Desktop

Add to your Claude MCP configuration:

```json
{
  "mcpServers": {
    "strudel-cloudflare": {
      "command": "node",
      "args": ["-e", "console.log('Remote MCP server')"],
      "env": {},
      "transport": {
        "type": "sse",
        "url": "https://strudel-mcp-server.YOUR-ACCOUNT.workers.dev/sse"
      }
    }
  }
}
```

## Local Development

```bash
# Test locally with Wrangler
npm run dev:worker

# Original stdio version
npm run dev
```

## Monitoring

```bash
# View logs
wrangler tail

# Check deployment status
wrangler deployments list
```