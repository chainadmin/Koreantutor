import type { FastifyInstance } from "fastify";
import { AuthService, type RegisterParams } from "./auth.service";

const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password", "role"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      role: { type: "string", enum: ["STUDENT", "PARENT"] },
      // Required when role === "STUDENT":
      displayName: { type: "string", minLength: 1 },
      gradeId: { type: "string" },
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
    const body = request.body as {
      email: string;
      password: string;
      role: "STUDENT" | "PARENT";
      displayName?: string;
      gradeId?: string;
    };

    if (body.role === "STUDENT" && (!body.displayName || !body.gradeId)) {
      return reply.code(400).send({ error: "displayName and gradeId are required for student registration" });
    }

    const params: RegisterParams =
      body.role === "STUDENT"
        ? { email: body.email, password: body.password, role: "STUDENT", displayName: body.displayName!, gradeId: body.gradeId! }
        : { email: body.email, password: body.password, role: "PARENT" };

    try {
      const tokens = await authService.register(params);
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
