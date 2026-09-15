import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { resolveStudentProfileId } from "../students/students.util";
import { UsersService } from "./users.service";

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app.prisma);

  app.post(
    "/links/request",
    { preHandler: [authenticate, requireRole("PARENT")] },
    async (request, reply) => {
      const { studentEmail } = request.body as { studentEmail: string };
      try {
        const link = await usersService.requestLink(request.user!.sub, studentEmail);
        return reply.code(201).send(link);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post(
    "/links/:linkId/approve",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { linkId } = request.params as { linkId: string };
      try {
        const studentProfileId = await resolveStudentProfileId(app.prisma, request.user!.sub);
        const link = await usersService.approveLink(studentProfileId, linkId);
        return reply.send(link);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post(
    "/links/:linkId/revoke",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { linkId } = request.params as { linkId: string };
      try {
        const studentProfileId =
          request.user!.role === "STUDENT" ? await resolveStudentProfileId(app.prisma, request.user!.sub) : "";
        const link = await usersService.revokeLink(request.user!.sub, studentProfileId, linkId);
        return reply.send(link);
      } catch (err) {
        return reply.code(403).send({ error: (err as Error).message });
      }
    },
  );

  app.get(
    "/me/students",
    { preHandler: [authenticate, requireRole("PARENT")] },
    async (request, reply) => {
      return reply.send(await usersService.listLinkedStudents(request.user!.sub));
    },
  );

  app.get(
    "/me/pending-requests",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const studentProfileId = await resolveStudentProfileId(app.prisma, request.user!.sub);
      return reply.send(await usersService.listPendingRequests(studentProfileId));
    },
  );
}
