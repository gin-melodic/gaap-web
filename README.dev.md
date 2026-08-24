# GAAP Web - Local Development Setup

## Prerequisites

- **Node.js 22+** (required)
- **npm** or **pnpm** (package manager)

## Installation

```powershell
# Install Node.js 22+ from https://nodejs.org/

# Navigate to gaap-web directory
cd gaap-web

# Install dependencies
npm install

# Or using pnpm
pnpm install
```

## Running the Development Server

### Option 1: Standard Development Mode (Recommended)

```powershell
# Start Next.js development server
npm run dev

# The server will start on http://localhost:3000
```

### Option 2: Docker-like Polling Mode (for WSL)

```powershell
# Use nodemon with polling for file watching
npm run dev:docker
```

## Configuration

### Environment Variables

Create a `.env.local` file in the `gaap-web` directory:

```env
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# ALE Bootstrap Key (same as backend)
ALE_BOOTSTRAP_KEY=your_bootstrap_key

# Turnstile (if using Cloudflare Turnstile)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
```

### Package.json Scripts

```json
{
  "dev": "next dev",                    // Standard dev mode
  "dev:docker": "nodemon --legacy-watch --watch src --ext ts,tsx,js,jsx,css --exec \"npm run dev:restart\"",
  "dev:restart": "next dev",            // Restart dev server
  "build": "next build",                // Build for production
  "start": "next start",                // Start production server
  "lint": "eslint",                     // Run ESLint
  "test": "vitest",                     // Run tests
  "proto": "node scripts/generate-proto.js"  // Generate TypeScript from protobuf
}
```

## Debugging in VSCode

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "env": {
        "NODE_OPTIONS": "--inspect-brk"
      }
    },
    {
      "name": "Attach to Node.js",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Custom Domain**: https://gaap.local (requires Caddy and hosts file setup)

## Testing

```powershell
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Linting

```powershell
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Troubleshooting

### Port Already in Use

```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- -p 3001
```

### Node Modules Issues

```powershell
# Remove node_modules and reinstall
rm -r node_modules
rm package-lock.json
npm install
```

### Hot Reload Not Working

```powershell
# Try polling mode
npm run dev:docker

# Or restart the dev server
Ctrl+C
npm run dev
```
