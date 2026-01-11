# Deployment Guide - Vercel

Your SpeechHelp project is ready for deployment on Vercel! Follow these steps:

## Option 1: Deploy via Git (Recommended)

1. **Push your code to GitHub, GitLab, or Bitbucket**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account (or GitLab/Bitbucket)
   - Click "Add New..." → "Project"
   - Select your repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - Click "Deploy"

## Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Select your project name
   - Link to existing project (if first time, select "create")
   - Confirm environment variables
   - Deployment will start automatically

4. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel redeploy
   ```

## Environment Variables to Add

Copy these from your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Note**: The `NEXT_PUBLIC_` prefix means these are public variables (safe to expose in browser).

## Project Configuration

Your project is configured with:
- **Framework**: Next.js 16.1.1
- **Node Version**: 20.x
- **Build Command**: `npm run build`
- **Install Command**: `npm install`

## After Deployment

1. Your site will be live at `your-project-name.vercel.app`
2. You can connect a custom domain in Vercel Settings
3. Automatic deployments trigger on every push to main branch
4. View logs and analytics in Vercel dashboard

## Troubleshooting

- **Build fails**: Check that all dependencies are installed (`npm install`)
- **Missing environment variables**: Ensure `NEXT_PUBLIC_SUPABASE_*` are set in Vercel
- **API errors**: Check Supabase connection and CORS settings
- **Static files not loading**: Verify all assets are in the `public/` folder

## Need Help?

- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Configuration](https://supabase.com/docs)
- Check Vercel deployment logs for specific errors
