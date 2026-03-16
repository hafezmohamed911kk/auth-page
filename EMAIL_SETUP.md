# Email Confirmation Setup Guide

## Problem: Confirmation Emails Not Being Sent

If users are successfully signing up but not receiving confirmation emails, it's likely because the **Service Role Key** is not configured.

## Solution: Configure Supabase for Email Sending

### Step 1: Get Your Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Scroll down to find **Service role key** (it's below the anon key)
5. Copy the entire key

### Step 2: Add to Environment Variables

#### For Local Development:
Add the service role key to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace `your-service-role-key-here` with the actual key you copied.

#### For Production (Vercel):
1. Go to your Vercel project settings
2. Navigate to the **Vars** tab
3. Add a new environment variable:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key from Supabase
   - **Environment:** Select appropriate environments (Production, Preview, Development)

### Step 3: Enable Email Sending in Supabase (Optional but Recommended)

By default, Supabase uses its own email provider. For production, you might want to configure a custom email provider:

1. Go to **Authentication → Providers → Email**
2. Configure your email settings

### Step 4: Test Email Sending

After configuring the service role key:

1. Restart your development server (`npm run dev`)
2. Create a new account using the signup form
3. Check your email inbox (or spam folder) for the confirmation email
4. The email should arrive within 5 seconds

## How It Works

1. User signs up with email and password
2. Supabase Auth creates the user account
3. Supabase automatically sends a confirmation email using the service role key
4. User clicks the link in the email to confirm their address
5. User account is fully activated

## Troubleshooting

### Email Still Not Arriving?

- **Check spam/junk folder** - Confirmation emails might be marked as spam
- **Verify service role key is set** - Check that `SUPABASE_SERVICE_ROLE_KEY` is in your environment
- **Check Supabase logs** - Go to your Supabase project → Logs to see if there are errors
- **Test email domain** - Some email providers block transactional emails from Supabase's default domain
- **Configure custom SMTP** - For production, use your own email service (SendGrid, AWS SES, etc.)

### Users Can Sign Up But Can't Log In Without Confirmation?

This is expected behavior. Users must confirm their email address before they can log in. The confirmation link in the email will activate their account.

## Environment Variables Summary

| Variable | Required? | Where to Get | Sensitive? |
|----------|-----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Settings → API | No (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (for emails) | Supabase Dashboard → Settings → API | **Yes** (keep secret) |

## Notes

- The Service Role Key has elevated permissions - **never expose it in the browser or client-side code**
- It should only be used in server-side operations (API routes, middleware, etc.)
- If compromised, rotate the key immediately in your Supabase dashboard
