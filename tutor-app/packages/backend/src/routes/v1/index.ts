import type { FastifyInstance } from "fastify";
import { authRoutes } from "../../modules/auth/auth.routes";
import { usersRoutes } from "../../modules/users/users.routes";
import { curriculumRoutes } from "../../modules/curriculum/curriculum.routes";
import { homeworkRoutes } from "../../modules/homework/homework.routes";
import { tutoringRoutes } from "../../modules/tutoring/tutoring.routes";

export async function registerV1Routes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(usersRoutes, { prefix: "/api/v1/users" });
  app.register(curriculumRoutes, { prefix: "/api/v1/curriculum" });
  app.register(homeworkRoutes, { prefix: "/api/v1/homework" });
  app.register(tutoringRoutes, { prefix: "/api/v1/tutoring" });
}
