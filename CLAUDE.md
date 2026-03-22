# Godoj

AI-powered conversational language learning app. Name comes from Silesian dialect meaning "speak/talk".

## Stack
- Next.js 16 (App Router) with TypeScript
- Supabase (PostgreSQL + Auth with magic links)
- ElevenLabs Conversational AI (voice agents)
- Anthropic Claude API (intelligence layer)
- Resend (transactional emails)
- Tailwind CSS v4 (dark theme)
- Vercel (hosting)

## Key conventions
- All user-facing text in Polish
- Code comments in English
- TypeScript strict mode
- `src/` directory structure
- Next.js 16: use `proxy.ts` instead of `middleware.ts`, `cookies()`/`headers()` are async
- Private app for ~10 invited users

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
