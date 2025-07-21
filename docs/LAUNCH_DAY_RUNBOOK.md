# 🚀 Blessed-Horizon Launch Day Runbook

## Overview
Step-by-step procedures for launch day operations, monitoring, and incident response.

---

## 📅 Launch Timeline

### T-24 Hours (Day Before Launch)
- [ ] 18:00 - Final code freeze
- [ ] 19:00 - Complete final testing
- [ ] 20:00 - Create production database backup
- [ ] 21:00 - Deploy to staging for final verification
- [ ] 22:00 - Team briefing and role assignment

### T-12 Hours
- [ ] 08:00 - Morning team sync
- [ ] 09:00 - Final infrastructure check
- [ ] 10:00 - Verify all monitoring systems
- [ ] 11:00 - Review rollback procedures
- [ ] 12:00 - Lock production deployments

### T-6 Hours
- [ ] 14:00 - Begin pre-launch checklist
- [ ] 15:00 - Scale up infrastructure
- [ ] 16:00 - Enable additional monitoring
- [ ] 17:00 - Final security scan
- [ ] 18:00 - Team dinner and final briefing

### T-1 Hour
- [ ] Enable maintenance mode
- [ ] Final database backup
- [ ] Clear all caches
- [ ] Deploy production code
- [ ] Run smoke tests

### T-0 Launch Time
- [ ] Remove maintenance mode
- [ ] Monitor all systems
- [ ] Track key metrics
- [ ] Communicate launch status

---

## 👥 Launch Team Roles

### Launch Commander
**Responsibilities:**
- Overall launch coordination
- Go/No-go decisions
- External communications
- Escalation point

**Contact:** [Name] - [Phone] - [Email]

### Technical Lead
**Responsibilities:**
- Deployment execution
- Technical troubleshooting
- System monitoring
- Performance optimization

**Contact:** [Name] - [Phone] - [Email]

### Database Administrator
**Responsibilities:**
- Database monitoring
- Query optimization
- Backup verification
- Data integrity

**Contact:** [Name] - [Phone] - [Email]

### Security Officer
**Responsibilities:**
- Security monitoring
- Threat detection
- Incident response
- Access control

**Contact:** [Name] - [Phone] - [Email]

### Customer Support Lead
**Responsibilities:**
- User communications
- Issue tracking
- FAQ updates
- Social media monitoring

**Contact:** [Name] - [Phone] - [Email]

---

## 🚀 Launch Procedures

### 1. Pre-Launch Verification (T-1 Hour)

```bash
# 1. Enable maintenance mode
./scripts/maintenance-mode.sh enable

# 2. Verify all services are running
./scripts/health-check-all.sh

# 3. Create final backup
./scripts/backup/create-launch-backup.sh

# 4. Clear all caches
redis-cli FLUSHALL
pm2 restart all

# 5. Deploy production code
./scripts/deploy-production.sh

# 6. Run database migrations
npm run migrate:prod

# 7. Verify edge functions
./scripts/verify-edge-functions.sh

# 8. Run smoke tests
npm run test:smoke
```

### 2. Launch Execution (T-0)

```bash
# 1. Remove maintenance mode
./scripts/maintenance-mode.sh disable

# 2. Monitor initial traffic
watch -n 1 './scripts/monitor-traffic.sh'

# 3. Check error rates
tail -f logs/error.log | grep -E "ERROR|CRITICAL"

# 4. Monitor database connections
./scripts/monitor-db-connections.sh

# 5. Track key metrics
./scripts/launch-metrics-dashboard.sh
```

### 3. Post-Launch Monitoring (T+1 Hour)

```bash
# 1. Generate launch report
./scripts/generate-launch-report.sh

# 2. Check all critical user flows
npm run test:critical-paths

# 3. Verify payment processing
./scripts/verify-payments.sh

# 4. Monitor performance metrics
./scripts/performance-dashboard.sh
```

---

## 📊 Key Metrics to Monitor

### System Health
```bash
# Real-time monitoring dashboard
tmux new-session -d -s monitoring

# Window 1: System resources
tmux send-keys -t monitoring:0 'htop' C-m

# Window 2: Application logs
tmux new-window -t monitoring:1
tmux send-keys -t monitoring:1 'pm2 logs --lines 100' C-m

# Window 3: Error tracking
tmux new-window -t monitoring:2
tmux send-keys -t monitoring:2 'tail -f logs/error.log' C-m

# Window 4: Database queries
tmux new-window -t monitoring:3
tmux send-keys -t monitoring:3 './scripts/monitor-slow-queries.sh' C-m

# Attach to session
tmux attach -t monitoring
```

### Critical Metrics Thresholds

| Metric | Green | Yellow | Red | Action |
|--------|-------|---------|-----|---------|
| Response Time | < 200ms | 200-500ms | > 500ms | Scale up servers |
| Error Rate | < 0.1% | 0.1-1% | > 1% | Investigate immediately |
| CPU Usage | < 60% | 60-80% | > 80% | Scale horizontally |
| Memory Usage | < 70% | 70-85% | > 85% | Restart services |
| DB Connections | < 50% | 50-80% | > 80% | Increase pool size |
| Queue Depth | < 100 | 100-500 | > 500 | Add workers |

---

## 🚨 Incident Response Procedures

### Severity Levels

**SEV-1 (Critical)**: Complete outage or data loss
- Response time: Immediate
- Team: All hands on deck
- Communication: Every 30 minutes

**SEV-2 (High)**: Major feature broken
- Response time: 15 minutes
- Team: Technical lead + specialist
- Communication: Every hour

**SEV-3 (Medium)**: Minor feature issues
- Response time: 1 hour
- Team: On-call engineer
- Communication: As needed

### Common Issues and Solutions

#### 1. High Error Rate
```bash
# Check error logs
tail -n 1000 logs/error.log | grep -E "ERROR|CRITICAL" | sort | uniq -c

# Check specific service
pm2 show blessed-horizon

# Restart if needed
pm2 restart blessed-horizon

# Scale up if resource issue
./scripts/scale-up.sh 2
```

#### 2. Database Connection Issues
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '10 minutes';

-- Check slow queries
SELECT query, state, wait_event_type, wait_event 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;
```

#### 3. Payment Processing Failures
```bash
# Check Stripe webhook status
curl https://api.stripe.com/v1/webhook_endpoints/we_xxx \
  -u sk_live_xxx:

# Verify webhook secret
./scripts/verify-webhook-secret.sh

# Replay failed webhooks
./scripts/replay-failed-webhooks.sh

# Check payment logs
grep "payment" logs/application.log | tail -100
```

#### 4. High Memory Usage
```bash
# Check memory usage by process
ps aux --sort=-%mem | head -20

# Check Node.js memory
pm2 monit

# Force garbage collection
pm2 trigger blessed-horizon gc

# Restart with increased memory if needed
pm2 restart blessed-horizon --max-memory-restart 2G
```

---

## 🔄 Rollback Procedures

### Quick Rollback (< 5 minutes)
```bash
# 1. Enable maintenance mode
./scripts/maintenance-mode.sh enable

# 2. Rollback application code
cd /home/blessed-horizon/blessed-horizon
git checkout previous-release-tag
npm install --production
npm run build

# 3. Rollback database if needed
psql $DATABASE_URL < backups/pre-launch-backup.sql

# 4. Clear caches
redis-cli FLUSHALL

# 5. Restart services
pm2 restart all

# 6. Disable maintenance mode
./scripts/maintenance-mode.sh disable
```

### Full Rollback (< 30 minutes)
1. Switch DNS to backup environment
2. Restore from complete system backup
3. Verify all services
4. Communicate status

---

## 📢 Communication Templates

### Launch Announcement
```
🎉 We're live! Blessed-Horizon is now available at https://blessed-horizon.com

✨ Key features:
- Secure donation processing
- Real-time campaign updates
- Trust score verification
- Mobile-optimized experience

Thank you for your patience during development. Let's make a difference together! 💙
```

### Issue Communication
```
🔧 We're experiencing [brief description of issue] affecting [affected features].

Our team is actively working on a resolution. 

Current status: [Investigating/Fixing/Testing]
Estimated resolution: [time]

We'll update you every [30/60] minutes. Thank you for your patience.
```

### Resolution Communication
```
✅ The issue with [description] has been resolved.

All systems are now operating normally. We apologize for any inconvenience.

If you continue to experience issues, please contact support@blessed-horizon.com
```

---

## 📞 Emergency Contacts

### Internal Team
- Launch Commander: [Name] - [Phone]
- Technical Lead: [Name] - [Phone]
- Database Admin: [Name] - [Phone]
- Security Officer: [Name] - [Phone]
- DevOps Lead: [Name] - [Phone]

### External Vendors
- Supabase Support: support@supabase.io
- Stripe Support: 1-888-926-2289
- SendGrid Support: support@sendgrid.com
- Hosting Provider: [Contact]
- Domain Registrar: [Contact]

### Escalation Path
1. On-call Engineer
2. Technical Lead
3. Launch Commander
4. CTO/Engineering Director
5. CEO (for public communications)

---

## ✅ Post-Launch Checklist

### T+1 Hour
- [ ] All systems stable
- [ ] Error rate < 0.1%
- [ ] Response times normal
- [ ] No security alerts
- [ ] Initial user feedback positive

### T+6 Hours
- [ ] First 1000 users onboarded
- [ ] Payment processing verified
- [ ] No major incidents
- [ ] Performance metrics good
- [ ] Team handoff complete

### T+24 Hours
- [ ] Generate 24-hour report
- [ ] Address any issues found
- [ ] Plan optimization tasks
- [ ] Schedule retrospective
- [ ] Celebrate success! 🎉

---

## 📝 Notes Section

Use this section to document any issues, decisions, or observations during launch:

```
Time | Issue | Action | Result | Owner
-----|-------|--------|--------|-------
     |       |        |        |
     |       |        |        |
     |       |        |        |
```

---

**Remember**: Stay calm, follow procedures, and communicate clearly. You've got this! 🚀
