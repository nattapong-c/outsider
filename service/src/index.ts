import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { connectDB } from "./lib/db";
import { roomRoutes } from "./controllers/room-controller";
import { wsRoutes } from "./controllers/ws-controller";
import { logger } from "./lib/logger";

// Initialize Database connection
connectDB();

const app = new Elysia()
  .use(swagger())
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:4444",
      credentials: true,
    }),
  )
  .use(roomRoutes)
  .use(wsRoutes)
  .get("/", () => "Outsider API is running")
  .listen(process.env.PORT || 3001);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type AppRouter = typeof app;
