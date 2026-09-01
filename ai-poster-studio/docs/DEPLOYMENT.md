# AI Poster Studio — Deployment Guide

## Step 1: Set up free-tier services

Sign up for each (no credit card needed for free tier):

| Service | URL | Use |
|---|---|---|
| Vercel | vercel.com | Web hosting |
| Clerk | clerk.com | Auth |
| Supabase | supabase.com | Postgres + Auth mirror |
| Cloudflare R2 | cloudflare.com | File storage |
| UploadThing | uploadthing.com | File uploads |
| Inngest | inngest.com | Background jobs |
| Groq | console.groq.com | LLM (free Llama 3.3 70B) |
| Google AI Studio | aistudio.google.com | Gemini 2.5 Flash (vision) |
| Anthropic | console.anthropic.com | Claude (poster designer) |
| Stripe | stripe.com | Payments |
| Resend | resend.com | Email |
| PostHog | posthog.com | Analytics |
| Sentry | sentry.io | Errors |
| Upstash | upstash.com | Redis |

## Step 2: Provision

### Supabase
1. Create new project
2. Settings → API → copy URL + service role key
3. SQL Editor → paste contents of `supabase/migrations/0001_init.sql` → run
4. Authentication → Providers → disable (we use Clerk)

### Clerk
1. Create application → choose "Email + Google"
2. API Keys → copy publishable + secret
3. Webhooks → add endpoint `/api/webhooks/clerk`, subscribe to `user.*` events, copy signing secret

### Cloudflare R2
1. Create bucket `ai-poster-studio`
2. R2 → Manage R2 API Tokens → create token with read/write on this bucket
3. Public access: enable custom domain or use presigned URLs

### UploadThing
1. Create new app
2. Copy token + secret

### Inngest
1. Create new app
2. Copy event key + signing key
3. Production: deploy → set serving host to your deployed `/api/inngest` URL

### Groq
1. Create API key (free tier: 30 RPM, 14.4k TPM)

### Google AI Studio
1. Create API key for Gemini 2.5 Flash

### Anthropic
1. Create API key
2. Note: paid. Set usage limits.

### Stripe
1. Create 3 products: Pro $19/mo, Lab $99/mo
2. Copy price IDs
3. Webhooks → add endpoint `/api/webhooks/stripe`, subscribe to `checkout.session.completed` + `customer.subscription.deleted`
4. Copy webhook signing secret

### Resend
1. Add domain (or use `onresend.com` for testing)
2. Create API key

### PostHog
1. New project → copy project API key + host

### Sentry
1. New project (Next.js) → copy DSN

### Upstash
1. Create Redis database → copy REST URL + token

## Step 3: Deploy

### Web → Vercel
```bash
# From repo root
vercel link
vercel env pull
# Add all variables from .env.example
vercel --prod
```

### Worker → Fly.io
```bash
cd apps/worker
fly auth signup
fly launch --no-deploy
fly secrets set GROQ_API_KEY=... GEMINI_API_KEY=... WORKER_API_KEY=...
fly secrets set R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
fly secrets set R2_BUCKET_NAME=ai-poster-studio
fly deploy
```

### Inngest
```bash
# Local: already running at http://localhost:8288
# Production: deploy from inngest.com dashboard
```

## Step 4: Smoke test

1. Visit your Vercel URL
2. Sign up via Clerk
3. Upload a paper at `/app/new`
4. Watch the 3-panel workspace run the agent
5. Download the poster PNG

## Step 5: Configure custom domain

- Vercel: Settings → Domains → add `aiposter.studio`
- Cloudflare: DNS → point CNAME to Vercel

## Cost projection

| Users | Posters/mo | Cost |
|---|---|---|
| 0–100 | < 100 | $0/mo (all free tiers) |
| 100–1k | < 1k | ~$20/mo (Resend Pro + Sentry) |
| 1k–10k | < 10k | ~$100/mo (+ worker scale + image gen) |
| 10k+ | < 100k | ~$500/mo (+ multiple workers + LLM costs) |