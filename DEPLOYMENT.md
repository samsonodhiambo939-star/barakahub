# BarakaHub Deployment Guide

## What's Deployed

| Component | Status | URL |
|-----------|--------|-----|
| Frontend (React) | ✅ Live | https://barakahub.pages.dev |
| Backend API (Express) | ⏳ Needs VPS | Not yet deployed |

## Frontend (Cloudflare Pages)

Already deployed. The frontend is live at **https://barakahub.pages.dev**.

To redeploy after changes:
```bash
cd barakahub-frontend
npm run build
npx wrangler pages deploy dist --project-name barakahub --branch main
```

## Backend (VPS - Oracle Cloud Free Tier)

### Prerequisites
- Oracle Cloud Free Tier account (Ampere A1 ARM instance)
- Ubuntu 24.04 LTS
- Domain name with Cloudflare DNS (optional but recommended)

### Step 1: Create the VPS

1. Go to https://cloud.oracle.com
2. Create a VM instance:
   - **Image**: Ubuntu 24.04 (canonical-ubuntu-24-04-aarch64)
   - **Shape**: VM.Standard.A1.Flex (ARM, 4 OCPU, 24GB RAM - FREE)
   - **Boot volume**: 200GB (free tier includes 200GB)
   - **Network**: Assign public IP, open ports 22, 80, 443

### Step 2: Upload & Setup

```bash
# From your local machine, upload the backend
scp -r barakahub-backend/* ubuntu@YOUR_VPS_IP:/opt/barakahub/backend/

# SSH into the VPS
ssh ubuntu@YOUR_VPS_IP
```

### Step 3: Run the Setup Script

```bash
# On the VPS
cd /opt/barakahub/backend
bash deploy/oracle-cloud-setup.sh
```

### Step 4: Configure Environment

```bash
cd /opt/barakahub/backend
cp .env.production .env
# Edit .env with your M-Pesa, Africa's Talking, and email credentials
nano .env
```

### Step 5: Install & Build

```bash
cd /opt/barakahub/backend
npm install --production
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### Step 6: Start with PM2

```bash
pm2 start dist/index.js --name barakahub-api
pm2 save
pm2 startup
```

### Step 7: Configure Nginx + SSL

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/barakahub
sudo ln -s /etc/nginx/sites-available/barakahub /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 8: Connect Frontend to Backend

Set the API URL as a build-time environment variable:

```bash
cd barakahub-frontend
VITE_API_URL=https://api.yourdomain.com npm run build
npx wrangler pages deploy dist --project-name barakahub --branch main
```

### Cloudflare DNS Setup

In your Cloudflare dashboard, add a DNS record:
- **Type**: A
- **Name**: api (or whatever subdomain you want)
- **Content**: Your VPS public IP
- **Proxy**: Proxied (orange cloud) for DDoS protection

## Environment Variables

### Backend (`.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | API port (default 3000) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Random 64-char string for JWT signing | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `AT_API_KEY` | Africa's Talking API key | For SMS |
| `MPESA_CONSUMER_KEY` | Safaricom Daraja consumer key | For M-Pesa |
| `MPESA_CONSUMER_SECRET` | Safaricom Daraja consumer secret | For M-Pesa |
| `MPESA_PASSKEY` | Safaricom Daraja passkey | For M-Pesa |
| `MPESA_SHORTCODE` | M-Pesa Paybill/Till number | For M-Pesa |
| `APP_URL` | Frontend URL (for CORS) | Yes |

### Frontend (`VITE_API_URL`)
Set at build time: `VITE_API_URL=https://api.yourdomain.com`

## Security Checklist

- [ ] JWT_SECRET changed to a unique random string
- [ ] PostgreSQL password changed
- [ ] M-Pesa keys set to production (not sandbox)
- [ ] Redis password set (edit `/etc/redis/redis.conf`)
- [ ] Firewall enabled (only ports 22, 80, 443)
- [ ] SSL/HTTPS enabled via Let's Encrypt
- [ ] Daily backups configured (cron job)
- [ ] Rate limiting configured
- [ ] 2FA enabled for admin/pastor accounts
