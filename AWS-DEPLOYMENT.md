# GrubAdmin Backend — AWS Deployment Guide

## Architecture Overview

```
Route 53 → CloudFront / ALB → ECS Fargate (API) → RDS (MySQL) + DocumentDB (MongoDB)
                                      ↓
                                 S3 (static assets)
```

Two deployment paths are covered:

1. **Quick EC2** — Single EC2 instance running Docker Compose (good for staging/light prod)
2. **Production ECS** — Fully managed, auto-scaling containers with managed databases

---

## Prerequisites

- AWS account with IAM user (programmatic access)
- Domain name (optional but recommended)
- AWS CLI installed and configured: `aws configure`
- Docker installed locally

---

# Option 1: Deploy on EC2 with Docker Compose

## Step 1: Launch EC2 Instance

1. Go to **EC2 → Launch Instance**
2. Name: `grubadmin-api`
3. **AMI**: Ubuntu 24.04 LTS (x86)
4. **Instance type**: `t3.medium` (2 vCPU, 4 GB RAM — minimum for Bun + MySQL + Mongo)
5. **Key pair**: Create or select existing (you'll need the `.pem` file)
6. **Network settings**:
   - Allow SSH (22) from your IP
   - Allow HTTP (80) and HTTPS (443) from anywhere
   - Allow custom TCP port `8000` from your app's domain or load balancer
7. **Storage**: 20 GB gp3
8. Launch and note the **Public IPv4 DNS** (e.g., `ec2-xx-xx-xx-xx.ap-southeast-1.compute.amazonaws.com`)

## Step 2: Attach Elastic IP (Optional)

1. Go to **EC2 → Elastic IPs → Allocate Elastic IP**
2. Associate it with your EC2 instance (gives you a static IP)

## Step 3: SSH into the EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

## Step 4: Install Dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker ubuntu

# Log out and back in
exit
```

SSH back in:

```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

## Step 5: Set Up the Application

```bash
# Create directory
mkdir -p /home/ubuntu/grubadmin
cd /home/ubuntu/grubadmin

# Clone or copy your code
git clone https://github.com/your-org/grubpac-admin-backend.git .
# OR: Use SCP to copy from local: scp -i key.pem -r ./GrubAdmin-Backend/* ubuntu@<IP>:/home/ubuntu/grubadmin/

# Copy .env (NEVER commit this)
nano .env
```

### Required `.env` variables:

```env
PORT=8000
NODE_ENV=production

# MySQL — uses the service name from docker-compose
DATABASE_URL=mysql://grub_user:StrongUserPass%40123@mysql:3306/grub_db

# MongoDB
MONGO_URI=mongodb://mongo_root:StrongMongoRoot%40123@mongo:27017/grubpac_logs?authSource=admin

# JWT / Auth
AUTH_SECRET=your-strong-random-secret-string

# Email (SMTP)
MAIL=your_email@example.com
MAIL_PASS=your_app_password

# AWS S3 (for uploads)
AWS_KEY=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-southeast-1
AWS_BUCKET_NAME=grubadmin-uploads

# Google Maps
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL (for CORS)
FRONTEND_URL=https://admin.yourdomain.com
```

## Step 6: Start the Application

```bash
docker compose up -d
```

Check logs:

```bash
docker compose logs -f api
```

## Step 7: Set Up Reverse Proxy (Nginx + SSL)

```bash
# Install nginx
sudo apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/grubadmin
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/grubadmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Step 8: Health Check

```bash
curl http://localhost:8000/health
# OR
curl https://api.yourdomain.com/health
```

---

## Step 9: Monitor & Maintain

```bash
# View logs
docker compose logs -f --tail=100 api

# Restart
docker compose restart api

# Update
git pull
docker compose down
docker compose up -d --build
```

---

# Option 2: Production Deployment on ECS Fargate + RDS + DocumentDB

## Step 1: Set Up Managed MySQL on RDS

1. Go to **RDS → Create database**
2. Engine: MySQL 8.0
3. **Templates**: Production
4. **DB instance identifier**: `grubadmin-mysql`
5. **Master username**: `grub_admin`
6. **Master password**: (auto-generate, save in Secrets Manager)
7. **Instance config**: `db.t3.medium` (burstable, 2 vCPU, 4 GB)
8. **Storage**: 20 GB gp3, auto-scaling enabled
9. **Connectivity**:
   - VPC: default or your custom VPC
   - Public access: No (private subnet, only accessible from ECS)
   - VPC security group: Create new `sg-rds-mysql`
10. **Additional config**:
    - Initial DB name: `grub_db`
    - Backup: 7 days retention
    - Enable deletion protection

**Security group rule for `sg-rds-mysql`**: Allow inbound MySQL (3306) from the ECS security group.

## Step 2: Set Up Managed MongoDB on DocumentDB

1. Go to **DocumentDB → Create cluster**
2. Engine: DocumentDB 5.0 (compatible with MongoDB 5.0)
3. **Cluster identifier**: `grubadmin-mongo`
4. **Instance class**: `db.t3.medium`
5. **Number of instances**: 1 (dev) or 3 (production)
6. **Connectivity**:
   - VPC: Same as RDS
   - Public access: No
   - Security group: `sg-docdb-mongo`
7. Username: `mongo_root`, password: (auto-generate)

**Security group rule for `sg-docdb-mongo`**: Allow inbound MongoDB (27017) from the ECS security group.

## Step 3: Create S3 Bucket for Uploads

```bash
aws s3 mb s3://grubadmin-uploads --region ap-southeast-1
aws s3api put-public-access-block \
  --bucket grubadmin-uploads \
  --public-access-block-configuration "BlockPublicAcls=true,BlockPublicPolicy=true,IgnorePublicAcls=true,RestrictPublicBuckets=true"
```

## Step 4: Store Secrets in AWS Secrets Manager

Create a secret `grubadmin/env` with key-value pairs:

```json
{
  "PORT": "8000",
  "NODE_ENV": "production",
  "DATABASE_URL": "mysql://grub_admin:password@grubadmin-mysql.cluster-xxxxxx.ap-southeast-1.rds.amazonaws.com:3306/grub_db",
  "MONGO_URI": "mongodb://mongo_root:password@grubadmin-mongo.cluster-xxxxxx.ap-southeast-1.docdb.amazonaws.com:27017/grubpac_logs?authSource=admin&tls=true&tlsCAFile=/global-bundle.pem",
  "AUTH_SECRET": "your-random-secret",
  "MAIL": "noreply@yourdomain.com",
  "MAIL_PASS": "your-smtp-password",
  "AWS_KEY": "AKIAXXXXXXXXXXXXXXXX",
  "AWS_SECRET": "xxxxxxxxxxxxxxxxxxxx",
  "AWS_REGION": "ap-southeast-1",
  "AWS_BUCKET_NAME": "grubadmin-uploads",
  "GOOGLE_MAPS_API_KEY": "xxxxx",
  "FRONTEND_URL": "https://admin.yourdomain.com"
}
```

## Step 5: Push Docker Image to ECR

```bash
# Login
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# Create repo
aws ecr create-repository --repository-name grubadmin-api --region ap-southeast-1

# Build & push
docker build -t grubadmin-api .
docker tag grubadmin-api:latest <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/grubadmin-api:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/grubadmin-api:latest
```

## Step 6: Create ECS Cluster & Service

### a. Create ECS Cluster

1. Go to **ECS → Clusters → Create Cluster**
2. **Name**: `grubadmin-cluster`
3. **Infrastructure**: AWS Fargate
4. **VPC**: Same VPC as RDS / DocumentDB

### b. Create Task Definition

1. Go to **ECS → Task Definitions → Create**
2. **Family**: `grubadmin-api-task`
3. **Infrastructure**: AWS Fargate
4. **Task size**: CPU 0.5 vCPU, Memory 1 GB (scale up as needed)
5. **Task role**: Create `ecsTaskRole` with:
   - `SecretsManagerReadWrite`
   - `AmazonS3FullAccess`
6. **Task execution role**: `ecsTaskExecutionRole` (AWS managed)
7. **Container**:
   - Name: `api`
   - Image: `<ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/grubadmin-api:latest`
   - Port mappings: `8000:8000`
8. **Environment variables**: Use **Secrets Manager** — reference the `grubadmin/env` secret

### c. Create Service

1. Go to **ECS → grubadmin-cluster → Services → Create**
2. **Launch type**: Fargate
3. **Task definition**: `grubadmin-api-task:1`
4. **Service name**: `grubadmin-api-service`
5. **Desired tasks**: 2 (for high availability)
6. **Security group**: `sg-ecs-api` with inbound rule: port 8000 from ALB
7. **Load balancer**: Create Application Load Balancer
   - **Listener**: HTTP:80 → Redirect to HTTPS:443
   - **Target group**: Port 8000, health check `/health`

## Step 7: Set Up DNS with Route 53

1. Go to **Route 53 → Hosted zones → yourdomain.com**
2. Create record:
   - Name: `api`
   - Type: A — Alias
   - Alias target: Application Load Balancer
   - Routing: Simple

## Step 8: Auto-scaling (Optional)

Configure **Service Auto Scaling** for the ECS service:
- Min tasks: 2
- Max tasks: 8
- Scaling policy: Target CPU 60% or memory 60%

## Step 9: Monitoring

- **CloudWatch Logs**: Container logs stream automatically
- **CloudWatch Alarms**: CPU > 80%, 5xx errors
- **RDS Performance Insights**: Database query performance
- **AWS X-Ray**: Trace API requests (requires SDK integration)

---

# CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-southeast-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: grubadmin-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster grubadmin-cluster \
            --service grubadmin-api-service \
            --force-new-deployment
```

---

# Security Checklist

- [ ] RDS & DocumentDB in **private subnets** (no public access)
- [ ] Security groups use **least privilege** (only allow specific ports from specific SGs)
- [ ] Secrets in **AWS Secrets Manager** (never in code or plaintext env)
- [ ] S3 bucket **blocked public access** (use presigned URLs)
- [ ] Database passwords auto-generated, rotated periodically
- [ ] ALB with **HTTPS only** (HTTP → HTTPS redirect)
- [ ] WAF enabled on ALB for SQL injection / XSS protection
- [ ] CloudTrail enabled for API auditing
- [ ] Backup: RDS automated backups + DocumentDB snapshots

---

# Cost Estimate (ap-southeast-1, monthly)

| Service           | Config                     | Cost   |
| ----------------- | -------------------------- | ------ |
| ECS Fargate       | 2 × 0.5 vCPU / 1 GB       | ~$60   |
| RDS MySQL         | db.t3.medium (1 instance)  | ~$50   |
| DocumentDB        | db.t3.medium (1 instance)  | ~$40   |
| ALB               | 1 LB + 1 GB data          | ~$25   |
| S3                | 10 GB + requests          | ~$1    |
| Secrets Manager   | 1 secret                   | ~$0.50 |
| **Total**         |                            | **~$175** |

---

# Troubleshooting

| Symptom                        | Likely Cause                              | Fix                                             |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------- |
| Container exits immediately    | DATABASE_URL wrong or DB unreachable      | Check RDS security group, verify connection URL |
| Prisma connection error        | MySQL not ready or TLS mismatch           | Wait for RDS, check `ssl=require` in URL        |
| Port 8000 not reachable        | Security group missing inbound rule       | Add SG rule for port 8000 from ALB or your IP   |
| Image pull fail                | ECR permissions missing                   | Attach `AmazonEC2ContainerRegistryReadOnly`     |
| 502 Bad Gateway from ALB       | Health check path wrong / app not ready   | Check target group health check path `/health`  |
| S3 uploads fail                | AWS credentials missing or wrong region   | Verify AWS_KEY, AWS_SECRET, AWS_REGION in env   |
| DocumentDB connection timeout  | TLS required, cert missing                | Download `https://truststore.pki.rds.amazonaws.com/global-bundle.pem` |
