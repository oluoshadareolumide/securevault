# 🔐 SecureVault — Full Stack Deployment Guide

A step-by-step guide to run, deploy, and host the SecureVault application.

---

## 📁 Project Structure

```
securevault/
├── backend/              ← Node.js / Express API
│   ├── server.js         ← Entry point
│   ├── routes/           ← auth, packages, files, apikeys, webhooks
│   ├── middleware/       ← JWT + API key auth
│   ├── utils/            ← db, mailer, webhooks, migrate
│   ├── uploads/          ← Local file storage (dev only)
│   ├── Dockerfile
│   └── .env.example      ← Copy to .env and fill in values
│
├── frontend/             ← React app
│   ├── src/
│   │   ├── App.js        ← Router setup
│   │   ├── context/      ← AuthContext
│   │   ├── pages/        ← Login, Register, Dashboard, Send, Packages, Receive, Settings
│   │   ├── components/   ← Layout (sidebar)
│   │   └── utils/        ← Axios API client
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf        ← Reverse proxy config
│
└── docker-compose.yml    ← Orchestrates all services
```

---

## PART 1: Run Locally (Development)

### Prerequisites
Install these first:
- **Node.js 20+** → https://nodejs.org
- **PostgreSQL 15+** → https://www.postgresql.org/download
- **Git** → https://git-scm.com

### Step 1 — Clone / set up the project

```bash
# If you have the zip, extract it. Otherwise create the folder:
cd securevault
```

### Step 2 — Set up the backend

```bash
cd backend

# Copy the example env file
cp .env.example .env

# Open .env and edit these required values:
#   DATABASE_URL  — your local PostgreSQL connection string
#   JWT_SECRET    — generate one with the command below

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output into JWT_SECRET in .env

# Install dependencies
npm install

# Create the database (in PostgreSQL):
psql -U postgres -c "CREATE DATABASE securevault;"

# Run migrations (creates all tables)
node utils/migrate.js

# Start the dev server (auto-restarts on changes)
npm run dev
```

✅ Backend running at **http://localhost:4000**
Test it: `curl http://localhost:4000/health` → should return `{"status":"ok"}`

### Step 3 — Set up the frontend

Open a **new terminal tab**:

```bash
cd frontend

# Install dependencies
npm install

# Start React dev server
npm start
```

✅ Frontend running at **http://localhost:3000**
The React app proxies `/api/*` requests to `localhost:4000` automatically (configured in `package.json`).

### Step 4 — Open the app

Go to http://localhost:3000 in your browser.
- Click **Create account** to register
- You're in! Try sending a package to yourself.

---

## PART 2: Run with Docker (Recommended for Production)

Docker packages everything into containers so you don't need to install Node or PostgreSQL manually.

### Prerequisites
- **Docker Desktop** → https://www.docker.com/products/docker-desktop (Mac/Windows)
- On Linux: `curl -fsSL https://get.docker.com | sh`

### Step 1 — Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and SMTP details
```

### Step 2 — Build and start all services

```bash
# From the securevault/ root directory:
docker-compose up --build

# This will:
# 1. Pull PostgreSQL image
# 2. Build the backend Docker image
# 3. Build the frontend (React → static files via Nginx)
# 4. Start everything and run migrations automatically
```

First build takes ~3–5 minutes. Subsequent starts are instant.

✅ App available at **http://localhost:80**

### Useful Docker commands

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop everything
docker-compose down

# Stop and delete database data (full reset)
docker-compose down -v

# Rebuild after code changes
docker-compose up --build
```

---

## PART 3: Deploy to a VPS (DigitalOcean / Hetzner / Linode)

This is the most cost-effective way to host ($6–12/month).

### Step 1 — Create a server

1. Sign up at **DigitalOcean** (https://digitalocean.com) or **Hetzner** (https://hetzner.com)
2. Create a new server (Droplet/Cloud VPS):
   - OS: **Ubuntu 24.04 LTS**
   - Size: **2 vCPU / 2GB RAM** minimum (4GB recommended)
   - Enable SSH key authentication

### Step 2 — Connect to your server

```bash
ssh root@YOUR_SERVER_IP
```

### Step 3 — Install Docker on the server

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 4 — Upload your code to the server

**Option A — Git (recommended):**
```bash
# On your server:
git clone https://github.com/YOURUSER/securevault.git
cd securevault
```

**Option B — Copy files directly:**
```bash
# From your local machine:
scp -r ./securevault root@YOUR_SERVER_IP:/root/securevault
```

### Step 5 — Configure environment on the server

```bash
cd /root/securevault/backend
cp .env.example .env
nano .env   # Edit with your values
```

Key values to set:
```
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=<run: openssl rand -hex 64>
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=<your SendGrid API key>
```

### Step 6 — Start the application

```bash
cd /root/securevault
docker-compose up -d --build
```

### Step 7 — Point your domain to the server

1. Buy a domain (Namecheap, Cloudflare, Google Domains)
2. In your domain's DNS settings, add an **A record**:
   - Name: `@` (or `www`)
   - Value: `YOUR_SERVER_IP`
   - TTL: 300

DNS propagation takes 5–30 minutes.

### Step 8 — Enable HTTPS with Let's Encrypt (Free SSL)

```bash
# Install Certbot on the server
apt install certbot -y

# Stop nginx temporarily to get a certificate
docker-compose stop nginx

# Get SSL certificate (replace with your domain)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates are saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Copy certs to the nginx folder
mkdir -p /root/securevault/nginx/certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /root/securevault/nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   /root/securevault/nginx/certs/
```

Now **uncomment the HTTPS section** in `nginx/nginx.conf` and update the domain name.

```bash
# Restart with HTTPS enabled
docker-compose up -d --build

# Auto-renew SSL every 90 days (add to crontab)
echo "0 3 * * * certbot renew --quiet && docker-compose -f /root/securevault/docker-compose.yml restart nginx" | crontab -
```

✅ Your app is now live at **https://yourdomain.com**

---

## PART 4: Deploy to AWS (More Scalable)

For production traffic, AWS provides managed services that scale automatically.

### Architecture
```
Internet → CloudFront CDN
              ↓
         ALB (Load Balancer)
              ↓
    ECS Fargate (Docker containers)
    ├── Backend service (Node.js)
    └── Frontend service (Nginx + React)
              ↓
    RDS PostgreSQL (managed database)
              ↓
    S3 (file storage, replace local uploads/)
```

### Step 1 — Install AWS CLI

```bash
# Mac
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install

# Configure with your AWS credentials
aws configure
```

### Step 2 — Push Docker images to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name securevault-backend --region us-east-1
aws ecr create-repository --repository-name securevault-frontend --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t securevault-backend .
docker tag securevault-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/securevault-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/securevault-backend:latest

# Build and push frontend
cd ../frontend
docker build -t securevault-frontend --build-arg REACT_APP_API_URL=https://api.yourdomain.com/api .
docker tag securevault-frontend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/securevault-frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/securevault-frontend:latest
```

### Step 3 — Create RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier securevault-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourSecurePassword \
  --allocated-storage 20 \
  --publicly-accessible \
  --region us-east-1
```

### Step 4 — Store secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name securevault/production \
  --secret-string '{
    "JWT_SECRET": "your-secret",
    "DATABASE_URL": "postgresql://postgres:pass@rds-endpoint:5432/securevault",
    "SMTP_PASS": "your-smtp-key"
  }'
```

### Step 5 — Deploy to ECS Fargate

Use the AWS Console or Terraform. The key ECS task definition:

```json
{
  "family": "securevault-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "backend",
    "image": "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/securevault-backend:latest",
    "portMappings": [{ "containerPort": 4000 }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "4000" }
    ],
    "secrets": [{
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT>:secret:securevault/production:JWT_SECRET::"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/securevault",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

---

## PART 5: Production Checklist

Before going live, make sure you've done all of these:

### Security
- [ ] `JWT_SECRET` is at least 64 random characters
- [ ] Database password is strong (20+ chars, mixed)
- [ ] `.env` is in `.gitignore` — never committed to git
- [ ] HTTPS enabled with valid SSL certificate
- [ ] File uploads stored in S3, not on the server disk
- [ ] Rate limiting is enabled (already in the code)

### Email
- [ ] SMTP configured (SendGrid free tier: 100 emails/day)
  - Sign up at https://sendgrid.com
  - Create an API key → Settings → API Keys
  - Set `SMTP_USER=apikey` and `SMTP_PASS=<your API key>`

### Backups
- [ ] Set up automated PostgreSQL backups

```bash
# Add to crontab — daily backup at 2am
echo "0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/sv_$(date +\%Y\%m\%d).sql.gz" | crontab -
```

### Monitoring
- [ ] Set up UptimeRobot (free) to ping `/health` every 5 min
  → https://uptimerobot.com

---

## PART 6: Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing auth tokens (64+ chars) |
| `PORT` | ❌ | API port (default: 4000) |
| `FRONTEND_URL` | ✅ | Your frontend URL (for CORS + email links) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `SMTP_HOST` | ❌ | SMTP server (e.g. smtp.sendgrid.net) |
| `SMTP_PORT` | ❌ | SMTP port (587 for TLS) |
| `SMTP_USER` | ❌ | SMTP username |
| `SMTP_PASS` | ❌ | SMTP password / API key |
| `SMTP_FROM` | ❌ | Sender email address |

---

## PART 7: Common Issues & Fixes

**"Cannot connect to database"**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -U postgres

# Verify connection string format:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**"CORS error in browser"**
```
# In backend .env, set:
FRONTEND_URL=http://localhost:3000  # (or your actual frontend URL)
```

**"File upload fails"**
```bash
# Check the uploads directory exists and is writable
mkdir -p backend/uploads
chmod 755 backend/uploads
```

**"Docker build fails on npm install"**
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

**Port 80 already in use**
```bash
# Find what's using it
sudo lsof -i :80
# Kill it or change nginx port in docker-compose.yml
```

---

## Quick Start Cheat Sheet

```bash
# LOCAL DEV (no Docker)
cd backend && cp .env.example .env   # edit .env
npm install && node utils/migrate.js && npm run dev
# New terminal:
cd frontend && npm install && npm start

# LOCAL WITH DOCKER
docker-compose up --build

# PRODUCTION (on your server)
git clone <repo> && cd securevault
nano backend/.env                    # fill in production values
docker-compose up -d --build
# Then set up domain + SSL as described in Part 3
```

---

*SecureVault is now a production-ready, fully integrated secure file transfer platform.*
*API docs: `GET /health` for status, see Settings page for full API reference.*
