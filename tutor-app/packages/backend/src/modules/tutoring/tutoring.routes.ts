import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { CurriculumService } from "../../services/curriculum.service";
import { MasteryService } from "../../services/mastery.service";
import { TutoringSession } from "../../services/tutoring/tutoring-session";
import { AnthropicTutorProvider } from "../../services/tutoring/providers/anthropic-tutor-provider";
import type { TutorProvider } from "../../services/tutoring/tutor-provider.interface";

// In-memory registry of live state machines, keyed by persisted session id.
// A real deployment would want this backed by a shared cache (e.g. Redis)
// so it survives process restarts and works across multiple app instances.
const liveSessions = new Map<string, TutoringSession>();

function buildProvider(): TutorProvider {
  return new AnthropicTutorProvider();
}

export async function tutoringRoutes(app: FastifyInstance) {
  const curriculumService = new CurriculumService(app.prisma);
  const masteryService = new MasteryService(app.prisma);

  app.post(
    "/sessions",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { conceptId } = request.body as { conceptId: string };
      const studentId = request.user!.sub;

      const concept = await curriculumService.getConcept(conceptId);
      const provider = buildProvider();
      const machine = new TutoringSession(provider, concept);

      const record = await app.prisma.tutoringSession.create({
        data: { studentId, conceptId, providerName: "anthropic", phase: "EXPLAIN" },
      });
      liveSessions.set(record.id, machine);

      return reply.code(201).send({ sessionId: record.id, phase: record.phase });
    },
  );

  app.post(
    "/sessions/:sessionId/advance",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const { answer } = request.body as { answer?: string };

      const machine = liveSessions.get(sessionId);
      if (!machine) {
        return reply.code(404).send({ error: "No live session for that id (process may have restarted)" });
      }

      const record = await app.prisma.tutoringSession.findUniqueOrThrow({ where: { id: sessionId } });
      const step = await machine.advance(answer);

      await app.prisma.$transaction([
        app.prisma.tutoringMessage.create({
          data: {
            sessionId,
            role: "TUTOR",
            phase: step.phase,
            content: step.content,
          },
        }),
        app.prisma.tutoringSession.update({
          where: { id: sessionId },
          data: {
            phase: machine.phase,
            endedAt: machine.phase === "COMPLETE" ? new Date() : null,
          },
        }),
      ]);

      if (step.isCorrect !== undefined) {
        await masteryService.recordAttempt(record.studentId, record.conceptId, step.isCorrect);
      }

      if (step.done) {
        liveSessions.delete(sessionId);
      }

      return reply.send(step);
    },
  );

  app.get(
    "/sessions/:sessionId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const session = await app.prisma.tutoringSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      return reply.send(session);
    },
  );
}
