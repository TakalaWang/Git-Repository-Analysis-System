# CI/CD Configuration Guide

Complete guide for setting up **Continuous Integration and Continuous Deployment (CI/CD)** pipeline for the **Git Repository Analysis System**.

## Table of Contents

- [Overview](#overview)
- [CI/CD Pipeline Stages](#cicd-pipeline-stages)
- [GitHub Secrets Setup](#github-secrets-setup)
- [Local Testing](#local-testing)
- [Deployment Process](#deployment-process)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline automatically:

1. **Lints and type-checks** code on every push/PR
2. **Runs all tests** to ensure code quality
3. **Builds the application** to verify it compiles
4. **Deploys to production VM** on main branch push
5. **Performs health checks** after deployment
6. **Rolls back automatically** if deployment fails

### Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Push / Pull Request                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: Lint & Type Check                                 │
│  - ESLint for code quality                                  │
│  - TypeScript type checking                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: Test                                              │
│  - Run all unit tests                                       │
│  - Generate coverage report                                 │
│  - Upload to Codecov                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: Build                                             │
│  - Build Next.js application                                │
│  - Upload build artifacts                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (only on main branch)
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: Deploy to VM                                      │
│  - SSH into production VM                                   │
│  - Backup current version                                   │
│  - Pull latest code                                         │
│  - Install dependencies                                     │
│  - Build application                                        │
│  - Reload PM2 (zero downtime)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 5: Health Check                                      │
│  - Wait for application to stabilize                        │
│  - Check /api/health endpoint                               │
│  - Retry up to 5 times                                      │
│  - Rollback if health check fails                           │
└─────────────────────────────────────────────────────────────┘
```

---

## CI/CD Pipeline Stages

### Stage 1: Lint & Type Check

**Purpose:** Ensure code quality and type safety

**Actions:**

- Run ESLint to check code style and catch potential bugs
- Run TypeScript compiler to verify types

**When it runs:**

- Every push to main or develop branches
- Every pull request to main branch

**Local equivalent:**

```bash
pnpm lint
pnpm type-check
```

---

### Stage 2: Test

**Purpose:** Verify functionality and prevent regressions

**Actions:**

- Run all Jest tests (unit and integration)
- Generate code coverage report
- Upload coverage to Codecov (if configured)

**When it runs:**

- After lint stage passes
- Every push/PR

**Local equivalent:**

```bash
pnpm test
pnpm test:coverage
```

---

### Stage 3: Build

**Purpose:** Verify application builds successfully

**Actions:**

- Build Next.js application for production
- Upload build artifacts for deployment

**When it runs:**

- After tests pass
- Every push/PR

**Local equivalent:**

```bash
pnpm build
```

---

### Stage 4: Deploy

**Purpose:** Deploy to production VM

**Actions:**

1. Connect to VM via SSH
2. Backup current version
3. Pull latest code from main branch
4. Install dependencies with pnpm
5. Build application
6. Reload PM2 with zero downtime
7. Save PM2 configuration

**When it runs:**

- Only on push to main branch
- After build stage passes

**Features:**

- **Zero Downtime**: PM2 reload ensures no service interruption
- **Automatic Backup**: Creates timestamped backup before deployment
- **Backup Retention**: Keeps last 5 backups, removes older ones
- **Rollback Support**: Can restore from backup if needed

---

### Stage 5: Health Check

**Purpose:** Verify deployment success

**Actions:**

- Wait 15 seconds for application to stabilize
- Check `/api/health` endpoint
- Retry up to 5 times with 5-second intervals
- Rollback if health check fails

**Health Check Endpoint:**

```
GET /api/health
Expected Response: { "status": "ok" }
Expected Status Code: 200
```

---

### Stage 6: Security Scan (Parallel)

**Purpose:** Identify security vulnerabilities

**Actions:**

- Run Trivy vulnerability scanner
- Run npm audit for dependency vulnerabilities
- Upload results to GitHub Security

**When it runs:**

- Parallel with other stages
- Every push/PR

---

## GitHub Secrets Setup

To enable CI/CD, configure the following secrets in your GitHub repository:

### Navigation

1. Go to your GitHub repository
2. Click **Settings**
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Required Secrets

#### Firebase Configuration (for tests and build)

| Secret Name                    | Description             | Example                        |
| ------------------------------ | ----------------------- | ------------------------------ |
| `FIREBASE_API_KEY`             | Firebase web API key    | `AIzaSyXXXXXXXXXXXXXXX...`     |
| `FIREBASE_AUTH_DOMAIN`         | Firebase auth domain    | `your-project.firebaseapp.com` |
| `FIREBASE_PROJECT_ID`          | Firebase project ID     | `your-project-id`              |
| `FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket | `your-project.appspot.com`     |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID      | `123456789012`                 |
| `FIREBASE_APP_ID`              | Firebase app ID         | `1:123456789012:web:abc123...` |

**How to get:**

- Firebase Console → Project Settings → Your apps → Web app config

#### VM Deployment Configuration

| Secret Name       | Description                   | Example                                    |
| ----------------- | ----------------------------- | ------------------------------------------ |
| `SSH_PRIVATE_KEY` | SSH private key for VM access | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `VM_HOST`         | VM hostname or IP address     | `123.456.789.012` or `your-domain.com`     |
| `VM_USER`         | SSH username                  | `ubuntu` or `root`                         |
| `VM_PORT`         | SSH port                      | `22` (default)                             |
| `DEPLOY_PATH`     | Application path on VM        | `/var/www/git-analyzer`                    |

**How to get SSH_PRIVATE_KEY:**

```bash
# On your local machine, generate SSH key pair if you don't have one
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# Copy the PRIVATE key content (entire file including header/footer)
cat ~/.ssh/deploy_key
# Copy this to GitHub Secret: SSH_PRIVATE_KEY

# Copy the PUBLIC key to your VM
ssh-copy-id -i ~/.ssh/deploy_key.pub user@your-vm-ip

# Or manually:
cat ~/.ssh/deploy_key.pub
# Then on VM: Add to ~/.ssh/authorized_keys
```

---

## Local Testing

Before pushing to GitHub, test your changes locally:

### 1. Lint and Type Check

```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Type check
pnpm type-check
```

### 2. Run Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode (during development)
pnpm test --watch
```

### 3. Build

```bash
# Build for production
pnpm build

# Test the build locally
pnpm start
# Visit http://localhost:3000
```

### 4. Test Full Pipeline Locally

```bash
# Simulate CI pipeline
pnpm lint && pnpm type-check && pnpm test && pnpm build
```

---

## Deployment Process

### Automatic Deployment

When you push to `main` branch:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"

# Push to main (triggers deployment)
git push origin main
```

### Manual Deployment (Emergency)

If automatic deployment fails, deploy manually:

```bash
# SSH into VM
ssh -i ~/.ssh/deploy_key user@your-vm-ip

# Navigate to app directory
cd /var/www/git-analyzer

# Pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Reload PM2
pm2 reload ecosystem.config.js

# Check status
pm2 status
pm2 logs git-analyzer --lines 50
```

### Monitoring Deployment

**In GitHub:**

1. Go to repository → **Actions** tab
2. Click on the latest workflow run
3. Watch real-time logs for each stage

**On VM (after deployment):**

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs git-analyzer

# View recent logs
pm2 logs git-analyzer --lines 100

# Monitor in real-time
pm2 monit
```

---

## Rollback Procedure

### Automatic Rollback

The CI/CD pipeline automatically rolls back if:

- Health check fails after deployment
- Application doesn't start properly

### Manual Rollback

If you need to rollback manually:

#### Option 1: Restore from Backup

```bash
# SSH into VM
ssh user@your-vm-ip

# Navigate to app directory
cd /var/www/git-analyzer

# List available backups
ls -lht backups/

# Restore from specific backup
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz

# Reload PM2
pm2 reload ecosystem.config.js

# Verify
pm2 logs git-analyzer --lines 50
```

#### Option 2: Rollback to Previous Commit

```bash
# On local machine, find the commit to rollback to
git log --oneline -10

# Reset to that commit
git reset --hard <commit-hash>

# Force push (use with caution!)
git push origin main --force
# This will trigger automatic deployment of the old version
```

#### Option 3: Revert Commit

```bash
# Safer than force push - creates a new commit that undoes changes
git revert <bad-commit-hash>
git push origin main
```

---

## Troubleshooting

### Deployment Fails at SSH Connection

**Symptoms:**

```
Permission denied (publickey)
```

**Solutions:**

1. **Verify SSH key is correct:**

   ```bash
   # Test SSH connection
   ssh -i ~/.ssh/deploy_key user@your-vm-ip
   ```

2. **Check GitHub Secret:**
   - Ensure `SSH_PRIVATE_KEY` includes header and footer
   - Format: `-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----`

3. **Check authorized_keys on VM:**
   ```bash
   cat ~/.ssh/authorized_keys
   # Should contain the public key
   ```

---

### Build Fails

**Symptoms:**

```
Error: Build failed
```

**Solutions:**

1. **Test build locally:**

   ```bash
   pnpm build
   ```

2. **Check for missing environment variables**
   - Ensure all Firebase secrets are set in GitHub

3. **Check for type errors:**
   ```bash
   pnpm type-check
   ```

---

### Tests Fail

**Symptoms:**

```
Tests failed with X errors
```

**Solutions:**

1. **Run tests locally:**

   ```bash
   pnpm test
   ```

2. **Check specific test file:**

   ```bash
   pnpm test src/path/to/test.test.ts
   ```

3. **Update snapshots if needed:**
   ```bash
   pnpm test -u
   ```

---

### Health Check Fails

**Symptoms:**

```
Health check failed after 5 attempts
```

**Solutions:**

1. **Check PM2 status on VM:**

   ```bash
   ssh user@your-vm-ip
   pm2 status
   pm2 logs git-analyzer --err
   ```

2. **Check if port 3000 is open:**

   ```bash
   curl http://your-vm-ip:3000/api/health
   ```

3. **Check Nginx configuration:**

   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **Manually restart application:**
   ```bash
   pm2 restart git-analyzer
   ```

---

### Secrets Not Working

**Symptoms:**

```
Context access might be invalid: SECRET_NAME
```

**Solutions:**

1. **Verify secret exists in GitHub:**
   - Settings → Secrets and variables → Actions
   - Check secret name matches exactly (case-sensitive)

2. **Check secret scope:**
   - Secrets must be repository secrets, not environment secrets
   - Or use environment secrets with correct environment name

3. **Re-create secret:**
   - Delete and re-create the secret
   - Ensure no extra spaces or line breaks

---

## Best Practices

### 1. Branch Protection

Configure branch protection rules:

1. Go to repository **Settings → Branches**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Include administrators

### 2. Testing Strategy

- **Always run tests locally** before pushing
- **Write tests for new features**
- **Maintain >80% code coverage**
- **Don't skip CI checks**

### 3. Deployment Strategy

- **Never deploy on Friday** (unless emergency)
- **Deploy during low-traffic hours**
- **Monitor logs after deployment**
- **Have rollback plan ready**

### 4. Security

- **Rotate SSH keys periodically** (every 6 months)
- **Use separate keys** for CI/CD and personal access
- **Never commit secrets** to repository
- **Review security scan results**

---

## Monitoring & Alerts

### GitHub Actions Notifications

Configure notifications:

1. Go to **Settings → Notifications**
2. Enable **Actions**
3. Choose notification method (email, mobile)

### PM2 Monitoring

Set up PM2 monitoring on VM:

```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View monitoring dashboard
pm2 monit
```

### External Monitoring

Consider adding external monitoring:

- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Uptime and performance monitoring
- **Datadog**: Comprehensive application monitoring
- **Sentry**: Error tracking and reporting

---

## CI/CD Optimization

### Speed Up Pipeline

1. **Cache dependencies:**
   - Already implemented with `cache: "pnpm"`

2. **Parallel jobs:**
   - Security scan runs in parallel

3. **Skip unnecessary steps:**
   - Build artifacts uploaded, not rebuilt for deploy

4. **Use faster runner:**
   - Currently using `ubuntu-latest`
   - Consider self-hosted runner for private repos

### Cost Optimization

For private repositories:

- **GitHub Actions minutes are limited**
- Public repos: Unlimited minutes
- Private repos: 2,000 minutes/month (free tier)

**Tips to reduce minutes:**

- Only run on `main` and `develop` branches
- Skip deployment for non-main branches
- Use `paths` filter to skip CI for documentation changes

Example:

```yaml
on:
  push:
    branches: [main, develop]
    paths-ignore:
      - "docs/**"
      - "**.md"
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## Summary

The CI/CD pipeline ensures:

✅ **Code Quality** - Automated linting and type checking
✅ **Test Coverage** - All tests run before deployment
✅ **Safe Deployment** - Zero downtime with automatic rollback
✅ **Monitoring** - Health checks and status notifications
✅ **Security** - Vulnerability scanning and secure SSH access

**Deployment is fully automated** - just push to `main` branch and the pipeline handles the rest!

For more information:

- [Deployment Guide](./DEPLOYMENT.md)
- [Getting Started](./GETTING_STARTED.md)
- [Architecture](./ARCHITECTURE.md)
