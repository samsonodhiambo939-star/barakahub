#!/bin/bash
set -e

echo "=== BarakaHub Server Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2 for process management
sudo npm install -g pm2

# Create barakahub user
sudo useradd -r -s /bin/false -m -d /opt/barakahub barakahub || true

# Setup PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE barakahub;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER barakahub WITH ENCRYPTED PASSWORD 'change-this-password';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE barakahub TO barakahub;" 2>/dev/null || true

# Configure Redis for persistence
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo systemctl enable redis-server

# Enable firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Copy backend files to /opt/barakahub/backend"
echo "2. Set up .env file"
echo "3. Run: npm install && npm run build"
echo "4. Run: npx prisma migrate deploy"
echo "5. Run: pm2 start dist/index.js --name barakahub-api"
echo "6. Set up nginx with provided config"
echo "7. Run: sudo certbot --nginx -d api.yourdomain.com"
echo "8. Point api.barakahub.pages.dev to VPS IP in Cloudflare DNS"
