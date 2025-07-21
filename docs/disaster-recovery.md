# Blessed-Horizon Disaster Recovery Plan

## Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Disaster Scenarios](#disaster-scenarios)
5. [Recovery Procedures](#recovery-procedures)
6. [Testing and Maintenance](#testing-and-maintenance)
7. [Contact Information](#contact-information)
8. [Recovery Checklists](#recovery-checklists)

## Overview

This document outlines the disaster recovery (DR) procedures for the Blessed-Horizon platform. It provides step-by-step instructions for recovering from various disaster scenarios and ensuring business continuity.

### Key Components
- **Database**: PostgreSQL (via Supabase)
- **Media Storage**: Supabase Storage buckets
- **Application**: Next.js application
- **Payment Processing**: Stripe integration
- **Infrastructure**: Vercel (frontend), Supabase (backend)

## Recovery Objectives

### Recovery Time Objective (RTO)
- **Critical Services**: 4 hours
- **Full Platform Recovery**: 24 hours
- **Historical Data Recovery**: 48 hours

### Recovery Point Objective (RPO)
- **Database**: Maximum 1 hour data loss
- **Media Files**: Maximum 24 hours data loss
- **Configuration**: Zero data loss (version controlled)

## Backup Strategy

### Database Backups

#### Automated Backups
- **Frequency**: Every 6 hours
- **Retention**:
  - Daily backups: 7 days
  - Weekly backups: 4 weeks
  - Monthly backups: 12 months
- **Storage**: AWS S3 (primary), Local NAS (secondary)
- **Encryption**: AES-256 at rest

#### Backup Script
```bash
# Run database backup
node scripts/backup/database-backup.js

# Verify backup
pg_restore --list backup_file.sql.gz | head -20
```

### Media Backups

#### Automated Backups
- **Frequency**: Daily at 2 AM UTC
- **Retention**:
  - Daily backups: 7 days
  - Weekly backups: 4 weeks
  - Monthly backups: 6 months
- **Storage**: AWS S3 Glacier
- **Format**: Compressed tar.gz archives

#### Backup Script
```bash
# Run media backup
node scripts/backup/media-backup.js

# List media backups
aws s3 ls s3://blessed-horizon-backups/media/
```

### Configuration Backups
- **Method**: Git version control
- **Repository**: Private GitHub repository
- **Includes**: Environment configurations, deployment scripts

## Disaster Scenarios

### 1. Database Corruption/Loss

#### Symptoms
- Application errors related to database
- Missing or corrupted data
- Database connection failures

#### Recovery Steps
1. Assess the damage
2. Stop application to prevent further corruption
3. Restore from latest backup
4. Verify data integrity
5. Resume services

### 2. Media Storage Failure

#### Symptoms
- Missing campaign images/videos
- 404 errors for media assets
- Upload failures

#### Recovery Steps
1. Switch to backup storage bucket
2. Restore media from latest backup
3. Update CDN configurations
4. Verify media accessibility

### 3. Complete Platform Outage

#### Symptoms
- All services unavailable
- Infrastructure provider issues
- Regional outages

#### Recovery Steps
1. Activate disaster recovery site
2. Update DNS records
3. Restore services in priority order
4. Communicate with stakeholders

### 4. Security Breach

#### Symptoms
- Unauthorized access detected
- Data manipulation
- Suspicious activities

#### Recovery Steps
1. Isolate affected systems
2. Revoke all access tokens
3. Restore from pre-breach backup
4. Implement additional security measures
5. Conduct security audit

## Recovery Procedures

### Database Recovery

#### Prerequisites
- Access to backup storage
- PostgreSQL client tools
- Supabase service key
- AWS CLI configured

#### Step-by-Step Recovery

1. **Download Latest Backup**
   ```bash
   # List available backups
   aws s3 ls s3://blessed-horizon-backups/database/2025/
   
   # Download specific backup
   aws s3 cp s3://blessed-horizon-backups/database/2025/blessed-horizon-daily-20250721120000.sql.gz .
   
   # Decompress backup
   gunzip blessed-horizon-daily-20250721120000.sql.gz
   ```

2. **Create Recovery Database**
   ```bash
   # Connect to Supabase
   psql $SUPABASE_DB_URL
   
   # Create recovery database
   CREATE DATABASE blessed_horizon_recovery;
   \q
   ```

3. **Restore Backup**
   ```bash
   # Restore to recovery database
   psql $SUPABASE_DB_URL/blessed_horizon_recovery < blessed-horizon-daily-20250721120000.sql
   
   # Verify restoration
   psql $SUPABASE_DB_URL/blessed_horizon_recovery -c "SELECT COUNT(*) FROM campaigns;"
   ```

4. **Validate Data Integrity**
   ```sql
   -- Check critical tables
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM campaigns;
   SELECT COUNT(*) FROM donations;
   
   -- Verify recent transactions
   SELECT * FROM donations 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

5. **Switch to Recovery Database**
   ```bash
   # Update environment variables
   export DATABASE_URL="postgresql://..../blessed_horizon_recovery"
   
   # Restart application
   pm2 restart blessed-horizon
   ```

### Media Recovery

1. **List Available Backups**
   ```bash
   aws s3 ls s3://blessed-horizon-backups/media/2025/ --recursive
   ```

2. **Download Media Archive**
   ```bash
   aws s3 cp s3://blessed-horizon-backups/media/2025/blessed-horizon-media-daily-20250721020000.tar.gz .
   ```

3. **Extract Archive**
   ```bash
   mkdir media-recovery
   tar -xzf blessed-horizon-media-daily-20250721020000.tar.gz -C media-recovery/
   ```

4. **Restore to Supabase Storage**
   ```bash
   # Use Supabase CLI or custom script
   node scripts/restore-media.js --source ./media-recovery --bucket campaign-media
   ```

5. **Verify Media Access**
   ```bash
   # Test random media files
   curl -I https://your-project.supabase.co/storage/v1/object/public/campaign-media/images/test.jpg
   ```

### Application Recovery

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/blessed-horizon.git
   cd blessed-horizon
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Update with production values
   vim .env.local
   ```

4. **Build Application**
   ```bash
   npm run build
   ```

5. **Deploy**
   ```bash
   # Deploy to Vercel
   vercel --prod
   
   # Or deploy to backup infrastructure
   npm run deploy:emergency
   ```

## Testing and Maintenance

### Monthly DR Tests

1. **Backup Verification**
   - Download random backup file
   - Verify integrity
   - Test restoration to dev environment

2. **Recovery Time Test**
   - Simulate database failure
   - Measure recovery time
   - Document any issues

3. **Access Verification**
   - Verify all team members can access backups
   - Test recovery credentials
   - Update documentation

### Quarterly Full DR Drill

1. **Scenario Selection**
   - Choose random disaster scenario
   - Don't announce in advance

2. **Execute Recovery**
   - Follow documented procedures
   - Time each step
   - Note any deviations

3. **Post-Mortem**
   - Review performance
   - Update procedures
   - Train team on findings

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| CTO | [Name] | [Phone] | [Email] |
| Lead Developer | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Database Admin | [Name] | [Phone] | [Email] |

### Service Providers

| Service | Support Email | Phone | Account # |
|---------|---------------|-------|-----------|
| Supabase | support@supabase.io | - | [Account] |
| Vercel | support@vercel.com | - | [Account] |
| AWS | - | [Phone] | [Account] |
| Stripe | support@stripe.com | - | [Account] |

### Escalation Path

1. On-call Engineer
2. DevOps Lead
3. Lead Developer
4. CTO
5. External Support

## Recovery Checklists

### Quick Reference - Database Recovery

- [ ] Stop application services
- [ ] Download latest backup from S3
- [ ] Create recovery database
- [ ] Restore backup
- [ ] Verify data integrity
- [ ] Update connection strings
- [ ] Restart application
- [ ] Monitor for errors
- [ ] Notify stakeholders

### Quick Reference - Media Recovery

- [ ] Identify missing media timeframe
- [ ] Download appropriate backup
- [ ] Extract archive
- [ ] Restore to storage bucket
- [ ] Clear CDN cache
- [ ] Verify media accessibility
- [ ] Update any hardcoded URLs
- [ ] Monitor for 404 errors

### Quick Reference - Security Breach

- [ ] Isolate affected systems
- [ ] Capture forensic data
- [ ] Revoke all API keys
- [ ] Reset all passwords
- [ ] Review access logs
- [ ] Restore from clean backup
- [ ] Implement additional monitoring
- [ ] Conduct security audit
- [ ] Notify affected users
- [ ] File incident report

## Appendix

### Useful Commands

```bash
# Check backup status
node scripts/check-backup-status.js

# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Verify Stripe webhook
curl -X POST https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID \
  -u $STRIPE_SECRET_KEY: \
  -d "url=https://blessed-horizon.com/api/webhooks/stripe"

# Check application health
curl https://blessed-horizon.com/api/health

# Monitor real-time logs
pm2 logs blessed-horizon --lines 100 -f
```

### Environment Variables Template

```env
# Database
DATABASE_URL=postgresql://...
DATABASE_URL_BACKUP=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AWS Backup
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BACKUP_S3_BUCKET=blessed-horizon-backups

# Notifications
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
BACKUP_NOTIFICATION_EMAILS=ops@blessed-horizon.com

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### Recovery Time Tracking

| Scenario | Target RTO | Last Test | Actual Time | Status |
|----------|------------|-----------|-------------|--------|
| Database Recovery | 4 hours | 2025-07-01 | 2.5 hours | ✅ Pass |
| Media Recovery | 8 hours | 2025-07-01 | 6 hours | ✅ Pass |
| Full Platform | 24 hours | 2025-06-15 | 18 hours | ✅ Pass |
| Security Breach | 6 hours | 2025-06-01 | - | ⏳ Due |

---

**Document Version**: 1.0  
**Last Updated**: July 21, 2025  
**Next Review**: August 21, 2025  
**Owner**: DevOps Team