#!/bin/bash
set -e

echo "Starting Instagram Automation Backend..."
mkdir -p /home/site/wwwroot/data
node index.js
