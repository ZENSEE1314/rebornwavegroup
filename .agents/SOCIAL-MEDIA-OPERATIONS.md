# Social Media Agent Operations

Use this runbook to let agents help with TikTok and Instagram without exposing your login password.

## What agents can do now

- Build a 7-day or 30-day content calendar.
- Write TikTok, Instagram Reels, Stories, carousel, and caption drafts.
- Create English, Chinese, and Indonesian versions.
- Prepare reply templates for comments and DMs.
- Score which videos are getting likes, shares, saves, and investor leads.
- Produce investor follow-up scripts and WhatsApp lead questions.

## What needs account connection

Direct posting, reading comments, replying to DMs, and pulling analytics need official platform access:

- Instagram: Meta Business account, Instagram professional account, Facebook Page connection, app permissions, and access tokens.
- TikTok: TikTok developer app, Content Posting API access, OAuth connection, and account approval where required.

Do not paste passwords into chat or agent prompts. Use environment variables or a secret manager.

## Recommended env vars

```text
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
FACEBOOK_PAGE_ID=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_ACCESS_TOKEN=
SOCIAL_APPROVAL_MODE=draft_first
```

## Safe workflow

1. Agents create post ideas, scripts, captions, hashtags, and thumbnails.
2. A human approves the final post.
3. Posting agent schedules or publishes through the official API.
4. Analytics agent collects results every day.
5. Growth Queen updates the next content plan based on winning hooks.

## Guardrails

- Investor content must say ROI is a target, not guaranteed return.
- No fake likes, fake followers, spam comments, or misleading claims.
- No auto-replies to investment questions without approved scripts.
- No public post should include private investor data.
- Human approval is required before paid ads or investor solicitation.

## First campaigns

- Floor tour series: 1 video per floor.
- Doluruu blindbox pet series: male, female, baby, feeding, token exchange.
- Sea-view live house series: sunset, live band, dance floor, VIP tables.
- Investor explainer series: $5,000 credits, $200K cap, referral deduction, disclaimer.
- Recruitment series: hosts, singers, stylists, pet cafe crew, event staff, promoters.
