# Fernleaf Kitchen — Frontend (Next.js)

The authoritative project documentation is the [root README](../README.md).

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                  # http://localhost:3000
```

The frontend is a presentation layer over the NestJS API: every request goes through `src/lib/api-client.ts` (`NEXT_PUBLIC_API_URL`, `credentials: "include"`, JSON or FormData), with typed contracts in `src/lib/api/` (`types.ts` holds the response types). Business rules live in the backend. Design tokens, the status map and the shared components are documented in [DESIGN.md](DESIGN.md).

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run build` | Production build |

## Dependencies and why

| Package | Why it is here |
|---|---|
| `@tanstack/react-query` | Server-state cache: deduplicated requests, invalidation after mutations, refetch intervals for the live kitchen and dispatch boards, and global 401 handling. It replaces hand-written `useEffect` fetching. |
| `@tanstack/react-query-devtools` (dev only) | Inspects cache keys during development. It renders nothing in production builds. |
| `@tanstack/react-table` (v8) | Headless table state for server-side pagination, sorting, row selection (invoice creation) and column visibility. It is styled with our own tokens. |
| `@tanstack/react-virtual` | Virtualizes the kitchen board so a 400-order day stays responsive. |
| `nuqs` | Typed URL state for filters, tabs and pagination, so links are shareable and Back works. |
| shadcn/ui (Base UI) plus `cmdk`, `react-day-picker`, `recharts` | The component primitives behind the sidebar, command palette (Cmd/Ctrl+K), date-range calendar and charts. These come from the existing shadcn setup; there is no second component library. |
| `next-themes` | Light, dark and system theme via the `class` strategy. |
| Geist / Geist Mono (`next/font/google`) | UI text, and tabular figures for money, times and order numbers. |

Money is formatted with `Intl.NumberFormat` using `NEXT_PUBLIC_CURRENCY` (default `INR`, locale `en-IN`). The API stores integer cents; the currency setting only changes display.
