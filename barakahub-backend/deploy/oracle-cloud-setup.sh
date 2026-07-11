#!/bin/bash
set -e

# ==========================================================
# BarakaHub - Oracle Cloud Free Tier Setup Script
# For Ampere A1 ARM instance (4 OCPU, 24GB RAM - Free)
# ==========================================================

echo "=== BarakaHub Oracle Cloud Setup ==="
echo "Target: Ubuntu 24.04 LTS (ARM64)"

# 1. System update
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 22 LTS (ARM64)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version

# 3. Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE barakahub;
CREATE USER barakahub WITH ENCRYPTED PASSWORD '$(openssl rand -base64 32)';
GRANT ALL PRIVILEGES ON DATABASE barakahub TO barakahub;
\c barakahub
GRANT ALL ON SCHEMA public TO barakahub;
EOF

echo "PostgreSQL database 'barakahub' created"

# 4. Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 5. Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# 6. Install PM2 for process management
sudo npm install -g pm2

# 7. Create app user
sudo useradd -r -s /bin/bash -m -d /opt/barakahub barakahub || true
sudo usermod -aG sudo barakahub

# 8. Install UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 9. Create directory structure
sudo mkdir -p /opt/barakahub/backend
sudo mkdir -p /opt/barakahub/frontend
sudo chown -R barakahub:barakahub /opt/barakahub

# 10. Print database URL for .env
DB_PASSWORD=$(sudo -u postgres psql -t -c "SELECT passwd FROM pg_shadow WHERE usename='barakahub';" 2>/dev/null || echo "check-password-above")

echo ""
echo "============================================"
echo "  BarakaHub Server Setup Complete!"
echo "============================================"
echo ""
echo "NEXT STEPS (manual):"
echo ""
echo "1. Upload backend code:"
echo "   scp -r barakahub-backend/* barakahub@YOUR_VPS_IP:/opt/barakahub/backend/"
echo ""
echo "2. Configure .env file:"
echo "   cp /opt/barakahub/backend/.env.production /opt/barakahub/backend/.env"
echo "   nano /opt/barakahub/backend/.env"
echo "   # Set DATABASE_URL, JWT_SECRET, M-Pesa keys, etc."
echo ""
echo "3. Install dependencies & build:"
echo "   cd /opt/barakahub/backend && npm install --production"
echo "   npx prisma generate"
echo "   npx prisma migrate deploy"
echo ""
echo "4. Start with PM2:"
echo "   pm2 start dist/index.js --name barakahub-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. Set up Nginx (use deploy/nginx.conf):"
echo "   sudo cp /opt/barakahub/backend/deploy/nginx.conf /etc/nginx/sites-available/barakahub"
echo "   sudo ln -s /etc/nginx/sites-available/barakahub /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "6. Set up SSL (Let's Encrypt):"
echo "   sudo certbot --nginx -d api.yourdomain.com"
echo ""
echo "7. Point your domain to VPS IP in Cloudflare DNS"
echo ""
echo "Your frontend is already live at: https://barakahub.pages.dev"
echo "============================================"
