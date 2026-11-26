---
quick_id: 261127-4sy
status: complete
---
# Email signup system — summary

Built: signups table (0006), lib/signup.js, api/signup.js (12th function), Google sign-in hook via waitUntil,
home form, list notices, scripts/test-signup.js. Home country US; GIFT_URL ("none" = no gift).

Verified: npm run test:signup passes; build (without migrate) passes; email and form screenshotted.
Not verified: live database, Resend, Vercel headers/function limit, real Google sign-in.

Not committed (user will ask). .env.example not updated (read blocked by a deny rule).
