# 🚀 Deploy EchoSpace to Vercel

## Quick Deploy (3 Steps)

### Step 1: Login to Vercel
```bash
vercel login
```
- Follow the prompts to authenticate
- Use your email or GitHub account

### Step 2: Deploy
```bash
vercel
```
- Answer the setup prompts:
  - Set up and deploy? **Yes**
  - Which scope? Select your account
  - Link to existing project? **No** (first time)
  - Project name? **echoSpace** (or your preferred name)
  - Directory? **./** (press Enter)
  - Override settings? **No** (press Enter)

### Step 3: Add Environment Variables

After initial deployment, add your Supabase credentials:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
```
Paste your Supabase URL, then:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Paste your Supabase anon key.

Then redeploy:
```bash
vercel --prod
```

---

## Alternative: Deploy via Vercel Dashboard

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Mudassiruddin7/EchoSpace.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your **EchoSpace** repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **./**
   - Build Command: **npm run build**
   - Output Directory: **.next**

### 3. Add Environment Variables
In the Vercel dashboard, add:
- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

### 4. Deploy
Click **Deploy** and wait for build to complete.

---

## Important: Database Setup

⚠️ **Before your app works, you MUST set up the database:**

1. Go to your Supabase SQL Editor
2. Run `sql/COMPLETE_DATABASE_SETUP.sql`
3. Verify with `sql/QUICK_VERIFY.sql`

Without the database tables, your app will show errors!

---

## Environment Variables Needed

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Your Supabase anonymous key |

Get these from: Supabase Dashboard → Settings → API

---

## Deployment Checklist

- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Database setup complete (ran `COMPLETE_DATABASE_SETUP.sql`)
- [ ] Environment variables ready (Supabase URL and key)
- [ ] Code committed to Git (optional, for GitHub deployment)
- [ ] Run `vercel` command
- [ ] Add environment variables to Vercel
- [ ] Deploy to production with `vercel --prod`

---

## Post-Deployment Steps

### 1. Test Your Deployment
Visit your Vercel URL (shown after deployment) and test:
- ✅ Homepage loads
- ✅ Create a profile
- ✅ Join a lobby
- ✅ Avatar movement works
- ✅ Chat functionality
- ✅ Voice chat (PeerJS)

### 2. Custom Domain (Optional)
Add a custom domain in Vercel dashboard:
1. Go to your project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### 3. Monitor Performance
- Check Vercel Analytics dashboard
- Monitor Supabase usage
- Review application logs

---

## Troubleshooting

### Build Fails
**Error: Missing environment variables**
- Add environment variables in Vercel dashboard
- Redeploy: `vercel --prod`

**Error: Database connection failed**
- Ensure database tables are created
- Verify Supabase URL and key are correct
- Check Supabase project is active

### Runtime Errors
**"profiles does not exist"**
- Run `sql/COMPLETE_DATABASE_SETUP.sql` in Supabase

**Chat not working**
- Enable Realtime in Supabase (Database → Replication)
- Check RLS policies are permissive

**Voice chat fails**
- PeerJS connections may need TURN server for production
- Check browser console for WebRTC errors

### Performance Issues
- Enable edge functions in Vercel
- Optimize avatar models (use compressed VRM files)
- Consider CDN for avatar files

---

## Vercel Configuration

The `vercel.json` file includes:
- ✅ Next.js framework detection
- ✅ Automatic environment variable handling
- ✅ Cache headers for static assets
- ✅ Optimal region selection (iad1 - US East)

---

## Commands Reference

```bash
# Login to Vercel
vercel login

# Deploy to preview (development)
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull

# View deployment logs
vercel logs

# Open project in browser
vercel open

# Remove a deployment
vercel remove [deployment-url]

# Link to existing project
vercel link
```

---

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch → Production deployment
- Every push to other branches → Preview deployment
- Pull requests → Automatic preview URLs

---

## Cost Considerations

**Vercel:**
- Free tier: Perfect for hobby projects
- Includes: 100GB bandwidth, unlimited deployments
- Upgrade if needed for custom domains, more bandwidth

**Supabase:**
- Free tier: 500MB database, 1GB file storage
- Includes: Realtime, authentication, storage
- Monitor usage in Supabase dashboard

---

## Next Steps After Deployment

1. ✅ Share your Vercel URL with users
2. ✅ Set up custom domain (optional)
3. ✅ Monitor analytics and errors
4. ✅ Configure CORS if needed
5. ✅ Set up error tracking (Sentry, LogRocket)
6. ✅ Enable Vercel Analytics
7. ✅ Configure CDN for assets

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs

Your EchoSpace metaverse is ready for the world! 🌐✨
