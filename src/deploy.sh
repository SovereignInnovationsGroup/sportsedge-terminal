#!/bin/bash

# SportsEdge Deployment Script
# Usage: ./deploy.sh

echo "🚀 Building SportsEdge..."
npm run build

echo "📦 Deploying to server..."
rsync -avz --delete dist/ username@your-server-ip:/var/www/html/sportsedge/

echo "🔧 Setting permissions..."
ssh username@your-server-ip "sudo chown -R www-data:www-data /var/www/html/sportsedge/ && sudo chmod -R 755 /var/www/html/sportsedge/"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://yourdomain.com"