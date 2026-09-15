import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./config/env";
import { prismaPlugin } from "./plugins/prisma";
import { registerV1Routes } from "./routes/v1";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(prismaPlugin);
  app.register(registerV1Routes);

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}

if (require.main === module) {
  const app = buildServer();
  app
    .listen({ port: env.port, host: "0.0.0.0" })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
