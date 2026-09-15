import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { HomeworkService } from "../../services/homework.service";

export async function homeworkRoutes(app: FastifyInstance) {
  const homeworkService = new HomeworkService(app.prisma);

  app.get(
    "/",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      return reply.send(await homeworkService.listForStudent(request.user!.sub));
    },
  );

  app.post(
    "/generate",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      try {
        const assignment = await homeworkService.assignFromWeakConcepts(request.user!.sub, {});
        return reply.code(201).send(assignment);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post(
    "/items/:itemId/submit",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { itemId } = request.params as { itemId: string };
      const { answer, isCorrect } = request.body as { answer: string; isCorrect: boolean };
      return reply.send(await homeworkService.submitAnswer(itemId, answer, isCorrect));
    },
  );
}
