import type { DatabaseSync } from "node:sqlite";

declare global {
  namespace Vike {
    interface PageContextServer {
      db: DatabaseSync;
    }
  }
}
