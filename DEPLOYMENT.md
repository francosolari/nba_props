# Deployment Guide - NBA Predictions

## Blue-Green Deployment Architecture

This project uses a blue-green deployment strategy for zero-downtime releases:

- **Blue** container runs on port 8000
- **Green** container runs on port 8002
- Nginx routes production traffic to one color at a time
- The idle color receives new deployments and is tested before going live

## Quick Deploy (Automated)

### Option 1: GitHub Actions (Recommended)

**Setup (one-time):**

1. Add secrets to your GitHub repository at `Settings > Secrets and variables > Actions`:
   ```
   DOCKER_USERNAME=fsolaric
   DOCKER_PASSWORD=<your-docker-hub-password>
   SSH_HOST=134.209.213.185
   SSH_USERNAME=root
   SSH_PRIVATE_KEY=<your-ssh-private-key>
   SECRET_KEY=<your-django-secret-key>
   DATABASE_HOST=propspredictions.com
   DATABASE_PORT=5432
   DATABASE_NAME=mydb
   DATABASE_USER=myuser
   DATABASE_PASSWORD=<your-db-password>
   SENDGRID_API_KEY=<your-sendgrid-key>
   DEFAULT_FROM_EMAIL=noreply@propspredictions.com
   CF_TURNSTILE_SITE_KEY=<your-turnstile-site-key>
   CF_TURNSTILE_SECRET_KEY=<your-turnstile-secret-key>
   GOOGLE_OAUTH_CLIENT_ID=<your-google-client-id>
   GOOGLE_OAUTH_SECRET=<your-google-secret>
   ```

2. Push to main branch:
   ```bash
   git push origin main
   ```

GitHub Actions will automatically:
- Build Docker image for linux/amd64
- Push to Docker Hub
- SSH into your server
- Run the blue-green deployment script
- Backup database
- Deploy to idle color
- Health check
- Flip traffic
- Rollback on failure

### Option 2: Manual Deployment

**1. Build and push image locally:**

```bash
cd /Users/francosolari/PycharmProjects/nba_props/nba_predictions

# Build for server architecture
docker buildx build --platform linux/amd64 -t fsolaric/nba_props_web:v1.0.0 --push .
```

**2. SSH into server and deploy:**

```bash
ssh root@134.209.213.185

cd /var/www/nba_props

# Load environment variables
source .env

# Run deployment script
./scripts/blue_green_deploy.sh fsolaric/nba_props_web:v1.0.0
```

The script will:
1. Detect current live color (blue or green)
2. Backup database
3. Pull new Docker image
4. Deploy to idle color
5. Run migrations
6. Health check
7. Prompt to flip traffic
8. Update Nginx
9. Verify production

## Rollback

If something goes wrong after deployment:

```bash
# The old color is still running! Just flip Nginx back:
ssh root@134.209.213.185

# If green is live and you want to rollback to blue:
sed -i 's/127.0.0.1:8002/127.0.0.1:8000/g' /etc/nginx/sites-enabled/propspredictions.conf
nginx -t && systemctl reload nginx

# If blue is live and you want to rollback to green:
sed -i 's/127.0.0.1:8000/127.0.0.1:8002/g' /etc/nginx/sites-enabled/propspredictions.conf
nginx -t && systemctl reload nginx
```

## Manual Testing Before Flip

You can test the idle deployment before flipping traffic:

```bash
# SSH to server
ssh root@134.209.213.185

# If deploying to green (port 8002), test it:
curl http://localhost:8002/

# Or from your local machine via SSH tunnel:
ssh -L 8002:localhost:8002 root@134.209.213.185

# Then visit http://localhost:8002 in your browser
```

## Environment Variables

Required on server in `/var/www/nba_props/.env`:

```bash
# Django
SECRET_KEY=<secret-key>
DJANGO_SETTINGS_MODULE=nba_predictions.settings

# Database
DATABASE_HOST=propspredictions.com
DATABASE_PORT=5432
DATABASE_NAME=mydb
DATABASE_USER=myuser
DATABASE_PASSWORD=<password>

# Email
SENDGRID_API_KEY=<key>
DEFAULT_FROM_EMAIL=noreply@propspredictions.com

# Cloudflare Turnstile
CF_TURNSTILE_SITE_KEY=<key>
CF_TURNSTILE_SECRET_KEY=<key>

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<id>
GOOGLE_OAUTH_SECRET=<secret>
```

## Monitoring

### Check Container Status

```bash
docker ps | grep nba_props
```

### View Logs

```bash
# Blue logs
docker logs nba_props_web-blue_1 -f

# Green logs
docker logs nba_props_web-green_1 -f
```

### Check Which Color is Live

```bash
grep proxy_pass /etc/nginx/sites-enabled/propspredictions.conf
```

## Database Backups

Backups are stored in `/var/www/backups/`:

```bash
ls -lh /var/www/backups/

# Restore from backup
docker exec -i nba_props_db_1 psql -U myuser mydb < /var/www/backups/nba_predictions_backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs nba_props_web-green_1 --tail 100

# Check if migrations failed
docker exec nba_props_web-green_1 python manage.py showmigrations

# Manually run migrations
docker exec nba_props_web-green_1 python manage.py migrate
```

### Worker timeouts

```bash
# Increase Gunicorn timeout and workers
# Edit the docker run command in the deployment script:
# --workers 4 --timeout 180
```

### Static files not loading

```bash
# Run collectstatic manually
docker exec nba_props_web-green_1 python manage.py collectstatic --noinput
```

### Nginx errors

```bash
# Test config
nginx -t

# Check logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

## Best Practices

1. **Always test locally first:**
   ```bash
   npm run build
   npm run dev
   ```

2. **Use semantic versioning for Docker tags:**
   ```bash
   fsolaric/nba_props_web:v1.2.3
   ```

3. **Run migrations in a separate step if they're complex:**
   ```bash
   docker exec nba_props_web-green_1 python manage.py migrate --plan
   ```

4. **Keep both colors running until confident:**
   - Don't stop the old color immediately
   - Monitor for 24 hours
   - Then cleanup old color

5. **Regular backups:**
   - Automated backups run before each deployment
   - Consider scheduled daily backups too

## Architecture Diagram

```
                                     ┌─────────────┐
                                     │   Nginx     │
                                     │   Port 80   │
                                     └──────┬──────┘
                                            │
                                            │ Proxy to 8000 or 8002
                                            │
                         ┌──────────────────┴──────────────────┐
                         │                                     │
                    ┌────▼─────┐                        ┌─────▼────┐
                    │  Blue    │                        │  Green   │
                    │ Port 8000│                        │Port 8002 │
                    │ (LIVE)   │◄──────Flip────────────►│ (IDLE)   │
                    └────┬─────┘                        └─────┬────┘
                         │                                     │
                         └──────────────────┬──────────────────┘
                                            │
                                     ┌──────▼──────┐
                                     │  PostgreSQL │
                                     │  Port 5432  │
                                     └─────────────┘
```

## Security Notes

- Never commit `.env` files
- Rotate secrets regularly
- Use SSH keys, not passwords
- Keep Docker Hub credentials secure
- Enable 2FA on GitHub and Docker Hub

## Support

For issues or questions:
- Check logs first
- Review this guide
- Check GitHub Issues
- Contact: franco@propspredictions.com
