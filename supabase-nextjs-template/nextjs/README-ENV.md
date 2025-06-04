# Environment Variables Setup

This application requires the following environment variables to be set in your `.env.local` file:

## Required Environment Variables

```
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site URL for notifications and links
NEXT_PUBLIC_SITE_URL=https://powerbrief.ai

# SendGrid Email Service
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## Environment Variable Details

- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for client-side Supabase access
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key for server-side operations that bypass RLS
- `NEXT_PUBLIC_SITE_URL`: The base URL of your deployed application (used for Slack notifications and public links)
- `SENDGRID_API_KEY`: Your SendGrid API key for sending emails
- `SENDGRID_FROM_EMAIL`: The verified sender email address in SendGrid

## Important Note About Service Role Key

The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges and can bypass Row Level Security (RLS). It should only be used in server-side code (API routes) and never exposed to the client. This key is essential for operations where unauthenticated users need to perform actions that would normally be restricted, such as the video review submission process.

## Setting Up Your Environment

1. Go to your Supabase project dashboard
2. Navigate to Project Settings > API
3. Copy the URL and keys to your `.env.local` file
4. Set `NEXT_PUBLIC_SITE_URL` to your deployed application URL (e.g., https://powerbrief.ai)
5. Set up SendGrid API key and verified sender email
6. Make sure your `.env.local` file is in your `.gitignore` to avoid committing sensitive information 