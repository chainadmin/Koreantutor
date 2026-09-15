import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env";
import type { AccessTokenPayload } from "../types/auth";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  try {
    const token = header.slice("Bearer ".length);
    request.user = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: "Not authenticated" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "Insufficient role" });
    }
  };
}
