#!/bin/bash
# Create data directory for SQLite
mkdir -p /home/site/wwwroot/data

# Run Prisma migrations
npx prisma migrate deploy

# Start the app
node dist/index.js
