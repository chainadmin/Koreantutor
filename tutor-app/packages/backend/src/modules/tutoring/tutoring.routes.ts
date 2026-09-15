import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { resolveStudentProfileId } from "../students/students.util";
import { CurriculumService } from "../../services/curriculum.service";
import { MasteryService } from "../../services/mastery.service";
import { TutoringSession } from "../../services/tutoring/tutoring-session";
import { AnthropicTutorProvider } from "../../services/tutoring/providers/anthropic-tutor-provider";
import type { TutorConcept, TutorProvider } from "../../services/tutoring/tutor-provider.interface";

// In-memory registry of live state machines, keyed by persisted conversation id.
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
    "/conversations",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { conceptId } = request.body as { conceptId: string };
      const studentId = await resolveStudentProfileId(app.prisma, request.user!.sub);

      const concept = await curriculumService.getConcept(conceptId);
      const tutorConcept: TutorConcept = {
        id: concept.id,
        title: concept.titleKo,
        description: concept.description,
      };

      const provider = buildProvider();
      const machine = new TutoringSession(provider, tutorConcept);

      const conversation = await app.prisma.tutorConversation.create({
        data: { studentId, conceptId },
      });
      liveSessions.set(conversation.id, machine);

      return reply.code(201).send({ conversationId: conversation.id, phase: machine.phase });
    },
  );

  app.post(
    "/conversations/:conversationId/advance",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const { answer } = request.body as { answer?: string };

      const machine = liveSessions.get(conversationId);
      if (!machine) {
        return reply.code(404).send({ error: "No live session for that id (process may have restarted)" });
      }

      const conversation = await app.prisma.tutorConversation.findUniqueOrThrow({
        where: { id: conversationId },
      });

      if (answer !== undefined) {
        await app.prisma.tutorMessage.create({
          data: { conversationId, role: "STUDENT", content: answer },
        });
      }

      const step = await machine.advance(answer);

      await app.prisma.tutorMessage.create({
        data: { conversationId, role: "TUTOR", content: step.content },
      });

      if (step.phase === "COMPLETE" || step.phase === "RECORD_WEAKNESS") {
        await app.prisma.tutorConversation.update({
          where: { id: conversationId },
          data: { endedAt: step.phase === "COMPLETE" ? new Date() : undefined },
        });
      }

      if (step.isCorrect !== undefined && conversation.conceptId) {
        await masteryService.recordAttempt(conversation.studentId, conversation.conceptId, step.isCorrect);
      }

      if (step.done) {
        liveSessions.delete(conversationId);
      }

      return reply.send(step);
    },
  );

  app.get(
    "/conversations/:conversationId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const conversation = await app.prisma.tutorConversation.findUniqueOrThrow({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      return reply.send(conversation);
    },
  );
}
