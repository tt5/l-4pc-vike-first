import "dotenv/config";
import { dbMiddleware } from "./server/db-middleware";
import { authMiddleware } from "./server/auth-middleware";
import { loginHandler, registerHandler, logoutHandler, verifyHandler, deleteHandler } from "./server/auth-handlers";
import vike, { toFetchHandler } from "@vikejs/fastify";
import fastify from "fastify";
import rawBody from "fastify-raw-body";
import type { Server } from "vike/types";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function getHandler() {
  const app = fastify({
    // Ensures proper HMR support
    forceCloseConnections: true,
  });

  // /!\ Mandatory if you need to access the request body in any Universal Middleware or Handler
  await app.register(rawBody);

  // Add support for form-data parsing
  await app.register(import('@fastify/formbody'));

  await vike(app, [
    // Make database available in Context as `context.db`
    dbMiddleware,
    // Make authenticated user available in Context as `context.user`
    authMiddleware,
    // Protected middleware temporarily removed to fix JSON display issue

    // Auth API handlers
    loginHandler,
    registerHandler,
    logoutHandler,
    verifyHandler,
    deleteHandler,

  ]);

  await app.ready();

  return toFetchHandler(app.routing.bind(app));
}

// https://vike.dev/server
export default {
  fetch: await getHandler(),
  prod: { port },
} as Server;
