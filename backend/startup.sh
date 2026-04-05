#!/bin/bash
set -e

echo "Starting Instagram Automation Backend..."

# Create data directory for SQLite
mkdir -p /home/site/wwwroot/data

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting Node.js server..."
node index.js
