import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}
