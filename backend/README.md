# Fernleaf Kitchen — Backend (NestJS + Prisma)

The authoritative project documentation is the [root README](../README.md).

```bash
cp .env.example .env        # DATABASE_URL, DIRECT_URL, TEST_DATABASE_URL, JWT_SECRET, optional CLOUDINARY_*
npm install
npx prisma generate
npx prisma migrate deploy   # never `db push` / `migrate reset`
npx prisma db seed          # deterministic, idempotent reviewer data
npm run start:dev           # http://localhost:3001
```

| Command | Purpose |
|---|---|
| `npm test` | Unit tests (no database, no Cloudinary) |
| `npm run test:e2e` | PostgreSQL integration/HTTP tests against the guarded `TEST_DATABASE_URL` |
| `npm run test:db:migrate` | Apply migrations to the test database only |
| `npx tsx prisma/verify-seed.ts` | Verify seeded data on the development database |
| `npm run lint` / `npx tsc --noEmit` / `npm run build` | Static checks and build |
