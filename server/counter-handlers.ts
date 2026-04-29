import type { DatabaseSync } from "node:sqlite";
import { enhance, type UniversalHandler } from "@universal-middleware/core";
import { randomBytes } from "crypto";

// Helper function for JSON responses
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

// Helper function to get or create a counter
function getOrCreateCounter(db: DatabaseSync, name: string) {
  let counter = db.prepare("SELECT id, name, value FROM counters WHERE name = ?").get(name) as
    | { id: string; name: string; value: number }
    | undefined;

  if (!counter) {
    const counterId = `counter_${randomBytes(16).toString("hex")}`;
    db.prepare("INSERT INTO counters (id, name, value) VALUES (?, ?, ?)").run(
      counterId,
      name,
      0
    );
    counter = { id: counterId, name, value: 0 };
  }

  return counter;
}

// GET /api/counter/:name - Get current counter value
export const getCounterHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const url = new URL(request.url);
      const name = url.pathname.split('/').pop();

      if (!name) {
        return jsonResponse({ error: "Counter name is required" }, 400);
      }

      const counter = getOrCreateCounter(context.db, name);

      return jsonResponse({
        name: counter.name,
        value: counter.value,
      });
    } catch (error) {
      console.error("Get counter error:", error);
      return jsonResponse({ error: "Failed to get counter" }, 500);
    }
  },
  { name: "my-app:counter-get", path: "/api/counter/:name", method: "GET", immutable: false },
);

// POST /api/counter/:name/increment - Increment counter and return new value
export const incrementCounterHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const url = new URL(request.url);
      const name = url.pathname.split('/').slice(0, -1).pop(); // Remove 'increment' from path

      if (!name) {
        return jsonResponse({ error: "Counter name is required" }, 400);
      }

      const counter = getOrCreateCounter(context.db, name);
      const newValue = counter.value + 1;

      // Update counter in database
      context.db.prepare("UPDATE counters SET value = ?, updated_at_ms = ? WHERE id = ?").run(
        newValue,
        Date.now(),
        counter.id
      );

      return jsonResponse({
        name: counter.name,
        value: newValue,
        previousValue: counter.value,
      });
    } catch (error) {
      console.error("Increment counter error:", error);
      return jsonResponse({ error: "Failed to increment counter" }, 500);
    }
  },
  { name: "my-app:counter-increment", path: "/api/counter/:name/increment", method: "POST", immutable: false },
);

// POST /api/counter/:name/reset - Reset counter to 0
export const resetCounterHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const url = new URL(request.url);
      const name = url.pathname.split('/').slice(0, -1).pop(); // Remove 'reset' from path

      if (!name) {
        return jsonResponse({ error: "Counter name is required" }, 400);
      }

      const counter = getOrCreateCounter(context.db, name);

      // Reset counter to 0
      context.db.prepare("UPDATE counters SET value = ?, updated_at_ms = ? WHERE id = ?").run(
        0,
        Date.now(),
        counter.id
      );

      return jsonResponse({
        name: counter.name,
        value: 0,
        previousValue: counter.value,
      });
    } catch (error) {
      console.error("Reset counter error:", error);
      return jsonResponse({ error: "Failed to reset counter" }, 500);
    }
  },
  { name: "my-app:counter-reset", path: "/api/counter/:name/reset", method: "POST", immutable: false },
);
