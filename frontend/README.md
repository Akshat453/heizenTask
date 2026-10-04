# Fernleaf Kitchen — Frontend (Next.js)

The authoritative project documentation is the [root README](../README.md).

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                  # http://localhost:3000
```

The frontend is a presentation layer over the NestJS API: every request goes through `src/lib/api-client.ts` (`NEXT_PUBLIC_API_URL`, `credentials: "include"`, JSON or FormData), with typed contracts in `src/lib/api.ts`. Business rules live in the backend.

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |
