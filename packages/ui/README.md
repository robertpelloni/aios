# Super AI Plugin - Dashboard UI

Next.js-based dashboard for the Super AI Plugin.

## Development

```bash
pnpm dev
```

The dashboard will be available at http://localhost:5173

## Building

```bash
pnpm build
```

## Deployment to Vercel

This dashboard is built with Next.js and can be easily deployed to Vercel:

### Option 1: Deploy from Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import the repository
3. Set the **Root Directory** to `packages/ui`
4. Vercel will automatically detect Next.js and configure the build settings
5. Deploy!

### Option 2: Deploy with Vercel CLI

```bash
cd packages/ui
npx vercel
```

### Environment Variables

If you need to configure the API backend URL for production, add:

- `NEXT_PUBLIC_API_URL`: URL of the backend API (defaults to http://localhost:3000)

## Architecture

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Real-time**: Socket.io Client
- **Backend**: Connects to the Core API on port 3000

## Pages

- `/` - Dashboard (System Overview)
- `/marketplace` - Plugin Marketplace
- `/secrets` - API Keys & Secrets
- `/mcp` - MCP Servers
- `/agents` - Agents & Active Intelligence
- `/prompts` - Prompt Library
- `/context` - Context Management
- `/hooks` - System Hooks
- `/inspector` - Traffic Inspector
