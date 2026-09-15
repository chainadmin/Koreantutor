import type { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service";

const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password", "name", "role"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      name: { type: "string", minLength: 1 },
      role: { type: "string", enum: ["STUDENT", "PARENT"] },
      locale: { type: "string" },
    },
  },
} as const;

const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  },
} as const;

const refreshSchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string" },
    },
  },
} as const;

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma);

  app.post("/register", { schema: registerSchema }, async (request, reply) => {
    const { email, password, name, role, locale } = request.body as {
      email: string;
      password: string;
      name: string;
      role: "STUDENT" | "PARENT";
      locale?: string;
    };

    try {
      const tokens = await authService.register({ email, password, name, role, locale });
      return reply.code(201).send(tokens);
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.post("/login", { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    try {
      const tokens = await authService.login(email, password);
      return reply.send(tokens);
    } catch (err) {
      return reply.code(401).send({ error: (err as Error).message });
    }
  });

  app.post("/refresh", { schema: refreshSchema }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const tokens = await authService.refresh(refreshToken);
      return reply.send(tokens);
    } catch (err) {
      return reply.code(401).send({ error: (err as Error).message });
    }
  });

  app.post("/logout", { schema: refreshSchema }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    await authService.logout(refreshToken);
    return reply.code(204).send();
  });
}
