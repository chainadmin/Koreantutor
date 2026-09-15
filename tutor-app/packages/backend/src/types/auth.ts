import type { UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // User.id (for STUDENT role, resolve StudentProfile.id separately)
  role: UserRole;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}
