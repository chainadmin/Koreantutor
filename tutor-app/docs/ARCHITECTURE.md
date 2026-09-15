# AI Tutoring App — Architecture

## Status
Scaffold for a mobile-first AI tutoring app: schema, service interfaces, and directory structure, verified end-to-end (`prisma migrate`, seed, and the full auth/curriculum/homework/tutoring-routing request path) against a real local Postgres instance — see "Next implementation step" below for what still needs a live deployment.

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

**Auth:** JWT-based session tokens + refresh tokens (rotated on use), argon2 password hashing.
- Roles: `STUDENT`, `PARENT` (role-based authorization middleware). A `STUDENT` `User` always owns exactly one `StudentProfile` (display name + grade), created at registration; a `PARENT` `User` has no profile.
- Parent↔student links require an explicit authorization step, never automatic: a parent requests a link by the student's email (`POST /users/links/request`), and only the student — scoped to their own authenticated `StudentProfile.id` — can approve it (`POST /users/links/:linkId/approve`). No shared secret/invite code is needed since the approval check is already scoped to the requester's own identity.

**AI Tutoring:** Provider-agnostic `TutorProvider` interface.
- Concrete implementations (e.g. `AnthropicTutorProvider`, the only file allowed to import the Anthropic SDK) plug in behind the interface — nothing else in the app talks to a vendor SDK directly.
- Tutoring flow (explain → question → evaluate → hint → retry → reveal → record weakness) is enforced by a `TutoringSession` state machine in the service layer, not left to prompting alone. The machine's `phase` is in-memory, per live conversation — the DB only persists the resulting `TutorMessage` rows (role + content) on the owning `TutorConversation`, plus the `StudentConceptMastery` update once an answer is evaluated.

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
          students/
            students.util.ts   # resolves StudentProfile.id from an authenticated User.id
          curriculum/
            curriculum.routes.ts
          homework/
            homework.routes.ts
          tutoring/
            tutoring.routes.ts
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
- `User` (role `STUDENT` | `PARENT`) + `RefreshToken`; `StudentProfile` (display name, grade) belongs to exactly one `STUDENT` user
- `ParentStudentLink` — explicit request/approval flow scoped to the student's own profile id, never automatic
- `Curriculum` → `SchoolLevel` → `Grade` → `Subject` → `Semester` → `Unit` → `Concept` → `LearningObjective` — the full curriculum tree, fully DB-driven; `ConceptPrerequisite` models cross-concept dependencies
- `Lesson` and `Question` (with `QuestionChoice`) hang off `Concept`; `QuestionType` distinguishes `PRACTICE` / `HOMEWORK` / `ASSESSMENT` questions
- `StudentConceptMastery` (0-100 `currentMastery`, keyed by `StudentProfile.id` + `Concept.id`) + `MasteryHistoryEntry` — per-student, per-concept mastery and its history
- `HomeworkAssignment` → `HomeworkQuestion` (references real `Question` rows)
- `TutorConversation` → `TutorMessage` — persists the state-machine-driven tutoring flow's transcript (the phase itself is in-memory, see above)
- `StudySession`, `StudyPlan`, `ProgressSnapshot` — scaffolded for later study-planning and parent weekly-report features, not yet wired to any route

## Why this is a first pass, not the full build
This scaffold has been verified against a real local Postgres instance in this environment: `prisma migrate dev` applies cleanly, `db:seed` populates demo data, and a running backend was smoke-tested end-to-end (register for both roles, parent→student link request/approval, curriculum reads, homework generation from a weak concept, and a tutoring conversation up to the point of calling the AI provider). It has not been deployed, nor run against a live Anthropic API key, nor exercised through the mobile app in a simulator/device.

## Recommended next implementation step
1. `npm install` at the repo root; `npm run db:migrate` against your own Postgres instance (a first migration already exists under `db/migrations/`).
2. Seed demo curriculum data (Middle School Grade 1 Math, Korea 2022 curriculum) via `npm run db:seed` — seeded rows are marked as DEMO DATA.
3. Set `ANTHROPIC_API_KEY` and run a tutoring conversation end-to-end on a single demo concept.
4. Wire Student Home + Parent Home screens to real (seeded) API responses instead of static placeholders, and replace the mobile registration screen's raw `gradeId` text input with a picker backed by `GET /api/v1/curriculum/grades`.
5. Wire up `StudySession` / `StudyPlan` / `ProgressSnapshot`, which are modeled but not yet exposed by any route.
