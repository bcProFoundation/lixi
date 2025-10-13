#!/bin/bash

# Script to start Docker services and then the API development server
# Usage: ./start-dev.sh

set -e  # Exit on any error

echo "🚀 Starting Lixi Development Environment"
echo "========================================"

# Change to project root directory
cd "$(dirname "$0")"

echo "📦 Starting Docker services..."
sudo docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🔧 Starting API development server..."
cd packages/app-lixi-api
pnpm start:dev

echo "✅ Development environment started successfully!"