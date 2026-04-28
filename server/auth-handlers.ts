import type { DatabaseSync } from "node:sqlite";
import { enhance, type UniversalHandler } from "@universal-middleware/core";
import { generateToken, getAuthUser, getTokenFromRequest, type TokenPayload } from "../lib/server/auth/jwt";
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

// POST /api/auth/login - Authenticate user and return JWT token
export const loginHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const requestData = await request.json() as { username: string; password: string };
      const { username, password } = requestData;

      if (!username || !password) {
        return jsonResponse({ error: "Username and password are required" }, 400);
      }

      // Check if user exists
      const user = context.db.prepare("SELECT id, username FROM users WHERE username = ?").get(username) as
        | { id: string; username: string }
        | undefined;

      if (!user) {
        // For development, create the user if it doesn't exist
        if (process.env.NODE_ENV !== "production") {
          const userId = `user_${randomBytes(16).toString("hex")}`;
          context.db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(
            userId,
            username,
            password
          );
          
          const token = generateToken({
            userId: userId,
            username: username,
          });

          return jsonResponse({
            user: {
              id: userId,
              username: username,
              token: token,
            },
          }, 200);
        } else {
          return jsonResponse({ error: "Invalid credentials" }, 401);
        }
      }

      const token = generateToken({
        userId: user.id,
        username: user.username,
      });

      return jsonResponse({
        user: {
          id: user.id,
          username: user.username,
          token: token,
        },
      }, 200);
    } catch (error) {
      console.error("Login error:", error);
      return jsonResponse({ error: "Failed to log in" }, 500);
    }
  },
  { name: "my-app:auth-login", path: "/api/auth/login", method: "POST", immutable: false },
);

// POST /api/auth/register - Register new user
export const registerHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const requestData = await request.json() as { username: string; password: string };
      const { username, password } = requestData;

      if (!username || !password) {
        return jsonResponse({ error: "Username and password are required" }, 400);
      }

      // Check if user already exists
      const existingUser = context.db.prepare("SELECT id FROM users WHERE username = ?").get(username);

      if (existingUser) {
        return jsonResponse({ error: "Username already exists" }, 400);
      }

      const userId = `user_${randomBytes(16).toString("hex")}`;

      context.db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(
        userId,
        username,
        password
      );

      const token = generateToken({
        userId: userId,
        username: username,
      });

      return jsonResponse({
        user: {
          id: userId,
          username: username,
          token: token,
        },
      }, 201);
    } catch (error) {
      console.error("Registration error:", error);
      return jsonResponse({ error: "Failed to register user" }, 500);
    }
  },
  { name: "my-app:auth-register", path: "/api/auth/register", method: "POST", immutable: false },
);

// POST /api/auth/logout - Logout user (client handles token removal)
export const logoutHandler: UniversalHandler<Universal.Context> = enhance(
  async (_request, _context, _runtime) => {
    // JWT-only auth - no cookies to clear
    // Client will handle token removal
    return jsonResponse({
      success: true,
      message: "Successfully logged out",
    });
  },
  { name: "my-app:auth-logout", path: "/api/auth/logout", method: "POST", immutable: false },
);

// GET /api/auth/verify - Verify current session
export const verifyHandler: UniversalHandler<Universal.Context> = enhance(
  async (request, _context, _runtime) => {
    try {
      const user = await getAuthUser(request);

      if (!user) {
        return jsonResponse(
          { valid: false, message: "No valid session found" },
          200
        );
      }

      return jsonResponse({
        valid: true,
        user: {
          id: user.userId,
          username: user.username,
          role: user.role || "user",
          token: getTokenFromRequest(request),
        },
      }, 200);
    } catch (error) {
      return jsonResponse(
        { valid: false, message: "Error verifying session" },
        500
      );
    }
  },
  { name: "my-app:auth-verify", path: "/api/auth/verify", method: "GET", immutable: false },
);
