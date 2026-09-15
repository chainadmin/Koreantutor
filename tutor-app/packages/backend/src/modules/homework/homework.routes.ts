import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { resolveStudentProfileId } from "../students/students.util";
import { HomeworkService } from "../../services/homework.service";

export async function homeworkRoutes(app: FastifyInstance) {
  const homeworkService = new HomeworkService(app.prisma);

  app.get(
    "/",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const studentId = await resolveStudentProfileId(app.prisma, request.user!.sub);
      return reply.send(await homeworkService.listForStudent(studentId));
    },
  );

  app.post(
    "/generate",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      try {
        const studentId = await resolveStudentProfileId(app.prisma, request.user!.sub);
        const assignment = await homeworkService.assignFromWeakConcepts(studentId);
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
