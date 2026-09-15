import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware";
import { CurriculumService } from "../../services/curriculum.service";

export async function curriculumRoutes(app: FastifyInstance) {
  const curriculumService = new CurriculumService(app.prisma);

  app.get("/curricula", { preHandler: [authenticate] }, async (_request, reply) => {
    return reply.send(await curriculumService.listCurricula());
  });

  app.get("/grades", { preHandler: [authenticate] }, async (request, reply) => {
    const { schoolLevelId } = request.query as { schoolLevelId?: string };
    return reply.send(await curriculumService.listGrades(schoolLevelId));
  });

  app.get("/grades/:gradeId", { preHandler: [authenticate] }, async (request, reply) => {
    const { gradeId } = request.params as { gradeId: string };
    return reply.send(await curriculumService.getGradeTree(gradeId));
  });

  app.get("/concepts/:conceptId", { preHandler: [authenticate] }, async (request, reply) => {
    const { conceptId } = request.params as { conceptId: string };
    return reply.send(await curriculumService.getConcept(conceptId));
  });
}
