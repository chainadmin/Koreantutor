import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.middleware";
import { CurriculumService } from "../../services/curriculum.service";

export async function curriculumRoutes(app: FastifyInstance) {
  const curriculumService = new CurriculumService(app.prisma);

  app.get("/subjects", { preHandler: [authenticate] }, async (_request, reply) => {
    return reply.send(await curriculumService.listSubjects());
  });

  app.get("/subjects/:subjectId", { preHandler: [authenticate] }, async (request, reply) => {
    const { subjectId } = request.params as { subjectId: string };
    return reply.send(await curriculumService.getSubjectTree(subjectId));
  });

  app.get("/concepts/:conceptId", { preHandler: [authenticate] }, async (request, reply) => {
    const { conceptId } = request.params as { conceptId: string };
    return reply.send(await curriculumService.getConcept(conceptId));
  });
}
