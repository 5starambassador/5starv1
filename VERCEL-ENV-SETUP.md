# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project to enable MSG91 SMS on production:

### 1. Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Select your project: `5starv1`

### 2. Navigate to Environment Variables
- Settings → Environment Variables

### 3. Add Each Variable

**Copy-paste these exactly:**

| Variable Name | Value |
|---------------|-------|
| `MSG91_AUTH_KEY` | `485538AfzLQYaH69672145P1` |
| `MSG91_SENDER_ID` | `ACHAPP` |
| `MSG91_TEMPLATE_ID_REGISTRATION` | `69671ce2f0f84f0363446ec4` |
| `MSG91_TEMPLATE_ID_FORGOT_PASSWORD` | `69671d580b181d4b4d18d092` |
| `MSG91_TEMPLATE_ID_REFERRAL` | `69671da09556fa4ffa1aaf28` |
| `SMS_PROVIDER` | `msg91` |

### 4. Select Environment Scope
For each variable:
- ✅ Production
- ✅ Preview (optional, recommended)
- ⬜ Development (not needed - uses local .env)

### 5. Redeploy
After adding all variables:
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

**OR simply:**
```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

### 6. Verify
After deployment completes:
- Visit: https://5starv1-nine.vercel.app
- Test OTP - you should receive actual SMS (not mock)

## Important Notes

⚠️ **Don't commit MSG91 credentials to GitHub**
- Keep them ONLY in Vercel environment variables
- The `.env` file should be in `.gitignore`

✅ **Custom Domain**
- Both `5starv1-nine.vercel.app` and `www.5starambassador.com` will work
- They share the same environment variables
