# Detailed Setup Guide

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project" and fill in:
   - **Project name**: Your project name
   - **Database password**: Save this securely
   - **Region**: Choose closest to your users

### 2. Get API Credentials

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → Extract the project ID (the subdomain)
   - **anon/public key** → This is your `VITE_SUPABASE_ANON_KEY`

### 3. Deploy Edge Functions

The server-side logic runs on Supabase Edge Functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy functions
supabase functions deploy make-server-b0f3b375 --project-ref YOUR_PROJECT_ID
```

### 4. Set Environment Variables in Supabase

Go to **Settings → Edge Functions** and add:

```
OPENAI_API_KEY=your-openai-key  # Optional, for AI features
```

## Hosting Options

### Vercel (Easiest)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Build the project: `npm run build`
2. Deploy `build/` folder to Netlify
3. Configure environment variables

### Self-Hosted

Any static file server works:

```bash
npm run build
# Serve the build/ directory
npx serve build
```

## OpenAI Setup (Optional)

For AI-powered analysis and transcription:

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add billing credits
4. Set `OPENAI_API_KEY` in Supabase Edge Function settings

## Customizing Tasks

Edit `src/components/TaskFlow.tsx` to customize:

- `taskScenarios` - The task descriptions shown to users
- `tasks` - The task components and titles

## Troubleshooting

### "Cannot connect to Supabase"
- Check your `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY`
- Ensure Edge Functions are deployed

### "Admin login doesn't work"
- Check your `VITE_ADMIN_PASSWORD` environment variable
- Clear browser cache and try again

### Screen recording not working
- User must grant screen sharing permission
- Some browsers restrict this feature
