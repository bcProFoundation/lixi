# Development Startup Script

This script automates the process of starting the Lixi development environment.

## Usage

```bash
./start-dev.sh
```

## What it does

1. **Starts Docker services** - Runs `docker-compose up -d` to start all required services in detached mode
2. **Waits for services** - Gives Docker services 10 seconds to initialize
3. **Starts API server** - Changes to `packages/app-lixi-api` and runs `pnpm start:dev`

## Prerequisites

- Docker and Docker Compose must be installed
- Node.js 20.x must be active (use `nvm use` if using nvm)
- pnpm must be installed globally

## Manual alternative

If you prefer to run commands manually:

```bash
# Terminal 1: Start Docker services
sudo docker-compose up -d

# Terminal 2: Start API development server
cd packages/app-lixi-api
pnpm start:dev
```