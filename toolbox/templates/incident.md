# Incident record

Use for a leak, an outage, wrong money or data crossing between companies. Follow SECURITY.md for a leak. Fill in as it happens.

- **Started (time) / noticed by:**
- **What happened:**
- **Which part:** member app / POS / kitchen / WhatsApp / database / host / one company (slug) / all
- **Customers or money affected:** (bills, amounts, companies)
- **Immediate step taken:** (and the time)
- **Evidence kept:** (Admin › Errors rows, logs; never paste secrets)

## If a secret may have been seen (SECURITY.md order)
- [ ] Database password (only when the owner decides)
- [ ] SESSION_SECRET
- [ ] ZENSEE_RESET_EMAIL / ZENSEE_RESET_PASSWORD removed from the host
- [ ] API keys (Anthropic, OpenAI, Resend, SendGrid, Stripe, Twilio, Spotify, Google, Apple, Expo, SEO)
- [ ] Meta / WhatsApp tokens and verify token
- [ ] Tokens saved in admin screens (karaoke, venue bridge, venue sync)
- [ ] Admin and manager passwords; staff told to change theirs
- [ ] VAPID keys only if exposed
- [ ] Admin › Logs and Admin › Errors read for strange entries

## After
- **Cause:**
- **Fix:**
- **Test added so it cannot come back:**
- **Playbook rule changed or added:**
