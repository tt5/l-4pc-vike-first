import type { db as sqliteDb } from "./database/sqlite/db";

declare global {
  namespace Vike {
    interface PageContextServer {
      db: ReturnType<typeof sqliteDb>;
    }
  }
}
