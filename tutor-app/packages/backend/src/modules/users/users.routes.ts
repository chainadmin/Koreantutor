import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { UsersService } from "./users.service";

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app.prisma);

  app.post(
    "/links/invite",
    { preHandler: [authenticate, requireRole("PARENT")] },
    async (request, reply) => {
      const { studentEmail } = request.body as { studentEmail: string };
      try {
        const link = await usersService.createInvite(request.user!.sub, studentEmail);
        return reply.code(201).send(link);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post(
    "/links/approve",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      const { inviteCode } = request.body as { inviteCode: string };
      try {
        const link = await usersService.approveInvite(request.user!.sub, inviteCode);
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
        const link = await usersService.revokeLink(request.user!.sub, linkId);
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
    "/me/parents",
    { preHandler: [authenticate, requireRole("STUDENT")] },
    async (request, reply) => {
      return reply.send(await usersService.listLinkedParents(request.user!.sub));
    },
  );
}
