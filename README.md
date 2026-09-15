# Korean Tutor

An AI tutoring app: React Native (Expo) mobile client + a Fastify/TypeScript
backend backed by PostgreSQL via Prisma, with a provider-agnostic interface
for the AI tutor itself.

All project code lives under [`tutor-app/`](./tutor-app). Start with
[`tutor-app/docs/ARCHITECTURE.md`](./tutor-app/docs/ARCHITECTURE.md) for the
full architecture writeup, stack decisions, data model, and the recommended
next implementation steps.

## Quick start

```bash
cd tutor-app
npm install
npm run db:migrate   # requires a running Postgres, see db/schema.prisma
npm run db:seed       # loads demo curriculum + demo accounts
npm run backend:dev   # starts the Fastify API on :4000
npm run mobile:start  # starts the Expo dev server
```
