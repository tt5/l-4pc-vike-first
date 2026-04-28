import { DatabaseSync } from "node:sqlite";

let singleton: DatabaseSync | undefined;

export function db(): DatabaseSync {
  if (!singleton) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL in .env file");
    }

    singleton = new DatabaseSync(process.env.DATABASE_URL);
  }
  return singleton;
}
