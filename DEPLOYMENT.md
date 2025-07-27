# 🚀 Production Deployment Guide

This guide covers deploying AI Chat Hub to production for real webhook usage.

## 🎯 Deployment Options

### Option 1: Vercel (Recommended)
**Pros:** Zero-config, automatic scaling, great Next.js support  
**Cons:** Function timeout limits (10s on Hobby, 60s on Pro)

### Option 2: Railway  
**Pros:** Full server control, no timeout limits, database included  
**Cons:** Slightly more complex setup

### Option 3: DigitalOcean App Platform
**Pros:** Simple deployment, competitive pricing  
**Cons:** Less Next.js specific optimizations

---

## 🔧 Pre-Deployment Setup

### 1. Environment Variables

Copy `env.example` to `.env.local` and update:

```bash
# Required for production
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
DATABASE_URL="your-supabase-connection-string"
DIRECT_URL="your-supabase-direct-connection-string"
GOOGLE_AI_API_KEY="your-google-ai-key"
CHATRA_WEBHOOK_SECRET="your-chatra-webhook-secret"
NODE_ENV="production"
PRODUCTION_DOMAIN="https://your-domain.com"
```

### 2. Database Preparation

Ensure your Supabase database has the pgvector extension:

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Build Test

```bash
npm run build
npm start
```

---

## 🚀 Vercel Deployment

### Step 1: Connect Repository
1. Push your code to GitHub/GitLab
2. Visit [vercel.com](https://vercel.com)
3. Import your repository
4. Select "Next.js" framework preset

### Step 2: Environment Variables
In Vercel dashboard → Settings → Environment Variables:

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret
DATABASE_URL=your-supabase-url
DIRECT_URL=your-supabase-direct-url
GOOGLE_AI_API_KEY=your-google-key
CHATRA_WEBHOOK_SECRET=your-chatra-secret
NODE_ENV=production
```

### Step 3: Deploy
1. Click "Deploy"
2. Wait for build completion
3. Test at `https://your-app.vercel.app`

### Step 4: Custom Domain (Optional)
1. Vercel Dashboard → Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` to your custom domain

---

## 🚂 Railway Deployment

### Step 1: Railway Setup
```bash
npm install -g @railway/cli
railway login
railway init
```

### Step 2: Environment Variables
```bash
railway variables set NEXTAUTH_URL=https://your-app.up.railway.app
railway variables set NEXTAUTH_SECRET=your-generated-secret
railway variables set DATABASE_URL=your-supabase-url
railway variables set DIRECT_URL=your-supabase-direct-url
railway variables set GOOGLE_AI_API_KEY=your-google-key
railway variables set CHATRA_WEBHOOK_SECRET=your-chatra-secret
railway variables set NODE_ENV=production
```

### Step 3: Deploy
```bash
railway up
```

---

## 🌊 DigitalOcean App Platform

### Step 1: Create App
1. DigitalOcean Control Panel → Apps
2. Create App → GitHub repository
3. Select your repository

### Step 2: Configure Build
- **Build Command:** `npm run build`
- **Run Command:** `npm start`
- **Environment:** Node.js 18+

### Step 3: Environment Variables
Add all required environment variables in the app settings.

---

## 🔗 Webhook Configuration

### Step 1: Get Your Webhook URL
After deployment, your webhook URL will be:
```
https://your-domain.com/api/chatra-webhook
```

### Step 2: Configure Chatra Webhooks
1. Login to your Chatra account
2. Go to Settings → Integrations → Webhooks
3. Add webhook URL: `https://your-domain.com/api/chatra-webhook`
4. Select events: `chatFragment`, `agentJoined`, `agentLeft`
5. Set secret to match your `CHATRA_WEBHOOK_SECRET`

### Step 3: Test Webhook
Send a test message in your Chatra chat to verify webhooks are working.

---

## 🔐 Security Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Verify `CHATRA_WEBHOOK_SECRET` matches Chatra settings
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Restrict database access to your app's IP if possible
- [ ] Use environment variables, never commit secrets

---

## 📊 Post-Deployment Setup

### 1. Create Admin User
Visit `https://your-domain.com` and run:
```bash
# If you have server access
node scripts/setup.js
```

Or create manually through the database.

### 2. Test Complete Flow
1. ✅ Admin login works
2. ✅ Knowledge base accessible
3. ✅ Webhook receives Chatra messages
4. ✅ LLM generates responses
5. ✅ Message approval works
6. ✅ Knowledge base auto-populates

### 3. Configure Chatra Accounts
1. Dashboard → Add Chatra Account
2. Enter API keys and webhook secrets
3. Test message flow

---

## 🐛 Troubleshooting

### Webhook Not Receiving
- Check webhook URL is publicly accessible
- Verify `CHATRA_WEBHOOK_SECRET` matches
- Check Chatra webhook logs

### Database Connection Issues
- Verify `DATABASE_URL` and `DIRECT_URL`
- Check Supabase connection pooling settings
- Ensure pgvector extension is enabled

### LLM Not Responding
- Verify `GOOGLE_AI_API_KEY` is valid
- Check API quota and billing
- Monitor application logs

### Build Failures
- Ensure all environment variables are set
- Check Node.js version compatibility
- Verify database migrations ran successfully

---

## 🔄 Updates & Maintenance

### Automatic Deployments
Most platforms auto-deploy on git push to main branch.

### Manual Deployment
```bash
# Update code
git pull origin main

# Deploy
railway up  # or platform-specific command
```

### Database Migrations
```bash
# If schema changes
npx prisma db push
```

---

## 📈 Monitoring

### Essential Monitoring
- Webhook delivery success rate
- LLM API response times
- Database connection health
- Knowledge base growth

### Recommended Tools
- **Vercel:** Built-in analytics
- **Railway:** Built-in logs and metrics
- **External:** LogRocket, Sentry for error tracking

---

**🎉 Your AI Chat Hub is now production-ready!**

Remember to test the complete flow after deployment and monitor the first few real conversations to ensure everything works correctly. 