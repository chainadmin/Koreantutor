# AI Tutoring App — Architecture

## Status
Greenfield scaffold: schema, service interfaces, and directory structure for a mobile-first AI tutoring app. Nothing here has been run against live infrastructure yet — see "Next implementation step" below.

## Stack decisions

**Mobile app:** React Native + Expo (TypeScript)
- Single codebase for iOS + Android.
- Expo Router for navigation (file-based, matches the screen list cleanly).
- i18n via `i18next` / `react-i18next`, Korean (`ko`) as default locale, English scaffolded for later.

**Backend:** Node.js + TypeScript, Fastify
- Fastify chosen over Express for built-in schema validation (JSON Schema) and speed; either works, this is a low-regret swap later.
- Modular service layer, one module per domain service (curriculum, mastery, homework, tutoring, auth).
- REST API (v1), versioned under `/api/v1`.

**Database:** PostgreSQL, Prisma ORM
- Prisma gives typed schema + migrations, and the schema shape (many linked entities) fits its relational modeling well.
- All curriculum content lives in DB tables — nothing hard-coded in UI or backend constants.

**Auth:** JWT-based session tokens + refresh tokens, argon2 password hashing.
- Roles: `STUDENT`, `PARENT` (role-based authorization middleware).
- Parent↔student links require an explicit authorization step (invite code / approval), never automatic.

**AI Tutoring:** Provider-agnostic `TutorProvider` interface.
- Concrete implementations (e.g. `AnthropicTutorProvider`) plug in behind the interface — nothing in the app talks to a vendor SDK directly.
- Tutoring flow (explain → question → evaluate → hint → retry → reveal → record weakness) is enforced by a `TutoringSession` state machine in the service layer, not left to prompting alone.

## Monorepo layout
```
tutor-app/
  docs/ARCHITECTURE.md
  db/schema.prisma
  db/seed.ts
  package.json                # npm workspaces root
  packages/
    backend/
      src/
        server.ts
        config/env.ts
        plugins/prisma.ts
        middleware/auth.middleware.ts
        modules/
          auth/
            auth.service.ts
            auth.routes.ts
          users/
            users.service.ts
            users.routes.ts
        services/
          curriculum.service.ts
          mastery.service.ts
          homework.service.ts
          tutoring/
            tutor-provider.interface.ts
            tutoring-session.ts
            providers/
              anthropic-tutor-provider.ts
        routes/v1/index.ts
    mobile/
      app/                     # Expo Router routes
        (auth)/login.tsx
        (auth)/register.tsx
        (student)/home.tsx
        (student)/tutor/[conceptId].tsx
        (student)/homework.tsx
        (parent)/home.tsx
        (parent)/link-student.tsx
        (parent)/progress/[studentId].tsx
      src/
        i18n/
        api/client.ts
```

## Data model (see `db/schema.prisma`)
- `User` (role `STUDENT` | `PARENT`), `RefreshToken`
- `ParentStudentLink` — explicit invite-code + approval flow, never automatic
- `Subject` → `Unit` → `Concept` — the curriculum tree, fully DB-driven
- `MasteryRecord` — per-student, per-concept mastery level
- `HomeworkAssignment` → `HomeworkItem`
- `TutoringSession` → `TutoringMessage` — records the state-machine-driven tutoring flow

## Why this is a first pass, not the full build
This scaffold defines schema, interfaces, and structure that a real dev environment can `npm install`, migrate, and run directly. It has not been installed, migrated against a live Postgres instance, or run end-to-end in this environment.

## Recommended next implementation step
1. `npm install` at the repo root; `npm run db:migrate` against a Postgres instance.
2. Wire the auth module's routes into a running server and exercise register/login/refresh.
3. Seed demo curriculum data (Middle School Grade 1 Math, Korea 2022 curriculum) via `npm run db:seed` — seeded rows are marked as DEMO DATA.
4. Wire Student Home + Parent Home screens to real (seeded) API responses instead of static placeholders.
5. Implement one concrete `TutorProvider` (e.g. `AnthropicTutorProvider`) and run the tutoring state machine end-to-end on a single demo concept.
