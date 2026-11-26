---
id: 260923-og-logo
type: quick
status: complete
title: Replace OG image — magazine cover → ÉcLAT° logo
created: 2026-09-23
commit: ef3cb80
---

# Quick Task: Replace OG image with ÉcLAT° logo

## Summary

Replaced the site's default Open Graph image (used in iMessage/WhatsApp/etc. link previews) from the old website screenshot (showing the magazine cover fan) to the official ÉcLAT° wordmark logo on a clean white background.

## What Changed

- **`public/assets/images/og/eclat-default.webp`**: Replaced with a 1200×630 OG-optimised WebP featuring the ÉcLAT° serif wordmark on white — matching the brand logo supplied by the user.

## Outcome

- Build: ✅ green (`npm run build`)
- Committed: `ef3cb80` — *chore: replace OG image -- magazine cover to EcLAT logo*
- Pushed: ✅ `origin/master` (rebased over `15e94d1..7be86d0`)
- All chat link previews (iMessage, WhatsApp, Telegram, etc.) will now show the ÉcLAT° logo instead of the magazine cover screenshot once Vercel redeploys.

## Notes

- No code changes — only the static image asset was replaced.
- `seo.js` `DEFAULT_OG` path (`/assets/images/og/eclat-default.webp`) was already correct; no JS changes needed.
