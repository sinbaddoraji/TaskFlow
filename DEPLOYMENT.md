# TaskFlow Deployment Guide with Portainer

This guide explains how to deploy TaskFlow using Portainer's "Deploy from Repository" feature.

## Prerequisites

- VPS with Docker and Portainer installed
- GitHub repository access
- Domain name (optional but recommended)

## Deployment Methods

### Method 1: Deploy from GitHub Repository (Recommended)

This method allows Portainer to pull the stack configuration directly from GitHub and build images automatically.

#### Step 1: Access Portainer

1. Navigate to your Portainer instance: `http://your-vps-ip:9000`
2. Log in with your credentials

#### Step 2: Create Stack from Repository

1. Go to **Stacks** → **Add Stack**
2. Choose **Repository** as the build method
3. Configure the repository settings:
   - **Name**: `taskflow`
   - **Repository URL**: `https://github.com/sinbaddoraji/TaskFlow.git`
   - **Repository reference**: `main` (or your branch name)
   - **Compose path**: `portainer-stack.yml`

#### Step 3: Configure Environment Variables

Copy the variables from `portainer.env.example` and add them in the **Environment variables** section:

**Required Variables (MUST CHANGE):**
```env
MONGO_ROOT_PASSWORD=<generate-strong-password>
JWT_SECRET=<generate-64-character-string>
FRONTEND_URL=https://your-domain.com
```

**Optional Variables (can use defaults):**
```env
MONGO_ROOT_USERNAME=admin
FRONTEND_PORT=80
JWT_ISSUER=TaskFlowAPI
JWT_AUDIENCE=TaskFlowClient
JWT_EXPIRATION=1440
JWT_REFRESH_EXPIRATION=30
ADDITIONAL_CORS_ORIGIN=https://www.your-domain.com
ENABLE_RATE_LIMITING=true
ENABLE_CSRF=true
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
LOG_LEVEL=Information
VERSION=latest
```

#### Step 4: Deploy

1. Enable **Enable relative path** if your compose file references other files
2. (Optional) Enable **GitOps updates** for automatic redeployment on git push
3. Click **Deploy the stack**

### Method 2: Manual Deployment with Pre-built Images

If you prefer to build images locally and push to a registry:

#### Step 1: Build Images Locally

```bash
# Build backend
docker build -t your-registry/taskflow-api:latest -f TaskFlow.Api/Dockerfile .

# Build frontend
docker build -t your-registry/taskflow-frontend:latest -f TaskFlow.Client/Dockerfile TaskFlow.Client/

# Push to registry
docker push your-registry/taskflow-api:latest
docker push your-registry/taskflow-frontend:latest
```

#### Step 2: Update Stack File

Modify `portainer-stack.yml` to use your registry images instead of building:

```yaml
taskflow-api:
  image: your-registry/taskflow-api:latest
  # Remove build section

taskflow-frontend:
  image: your-registry/taskflow-frontend:latest
  # Remove build section
```

#### Step 3: Deploy via Portainer

Follow the same steps as Method 1, but Portainer will pull images instead of building.

## Post-Deployment Configuration

### 1. Verify Services

Check that all services are running:
- MongoDB: Internal service (not exposed)
- API: Available internally on port 8080
- Frontend: Available on port 80 (or configured port)

### 2. Configure Domain & SSL

#### Option A: Using Nginx Reverse Proxy

1. Install Nginx on your VPS
2. Configure SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. Add Nginx configuration:
```nginx
server {
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

#### Option B: Using Cloudflare

1. Add your domain to Cloudflare
2. Point DNS to your VPS IP
3. Enable SSL/TLS in Cloudflare dashboard
4. Set SSL mode to "Flexible" or "Full"

### 3. Database Backups

Use the provided backup script:

```bash
# Copy script to VPS
scp scripts/backup.sh user@your-vps:/opt/taskflow/

# Make executable
chmod +x /opt/taskflow/backup.sh

# Run backup
./backup.sh

# Setup automated backups (daily at 2 AM)
./backup.sh
# Choose option 6 to setup cron job
```

### 4. Monitoring

#### Via Portainer:
- View container logs
- Monitor resource usage
- Set up alerts

#### Health Checks:
- Frontend: `http://your-domain/health`
- API: `http://your-domain/api/health`

## Updating the Application

### With GitOps (Automatic):

If you enabled GitOps updates:
1. Push changes to your GitHub repository
2. Portainer automatically redeploys within the configured interval

### Manual Update:

1. Go to Stacks → taskflow
2. Click **Pull and redeploy**
3. Portainer will pull latest changes and rebuild

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
- Check MongoDB container is healthy: `docker ps`
- Verify password in environment variables
- Check logs: `docker logs taskflow-mongodb`

#### 2. Frontend Can't Connect to API
- Verify CORS settings in environment variables
- Check API health endpoint
- Review API logs: `docker logs taskflow-api`

#### 3. Build Failures
- Ensure sufficient disk space
- Check Docker build context size
- Review Portainer task logs

### Useful Commands

```bash
# View all containers
docker ps -a

# View logs
docker logs <container-name>

# Enter container shell
docker exec -it <container-name> /bin/sh

# Restart stack
docker-compose -f portainer-stack.yml restart

# Clean up unused resources
docker system prune -a
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Configured strong JWT secret
- [ ] Set up SSL/HTTPS
- [ ] Enabled rate limiting
- [ ] Configured firewall rules
- [ ] Set up automated backups
- [ ] Disabled unnecessary ports
- [ ] Configured fail2ban (optional)
- [ ] Set up monitoring alerts

## Support

For issues or questions:
1. Check container logs in Portainer
2. Review this documentation
3. Open an issue on GitHub: https://github.com/sinbaddoraji/TaskFlow/issues