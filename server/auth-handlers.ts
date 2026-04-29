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
      let username: string;
      let password: string;

      // Handle form-data (traditional HTML form submission)
      const formData = await request.formData();
      username = formData.get("username") as string;
      password = formData.get("password") as string;

      if (!username || !password) {
        return jsonResponse({ error: "Username and password are required" }, 400);
      }

      // Check if user exists
      const user = context.db.prepare("SELECT id, username FROM users WHERE username = ?").get(username) as
        | { id: string; username: string }
        | undefined;

      let token: string;
      let userId: string;

      if (!user) {
        // Redirect back to login with error
        return new Response(null, {
          status: 302,
          headers: { "Location": "/login?error=invalid" },
        });
      }

      userId = user.id;

      token = generateToken({
        userId: userId,
        username: username,
      });

      // Redirect to login page with cookie
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/login?login=true",
          "Set-Cookie": `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
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
      let username: string;
      let password: string;
      
      // Handle form-data (traditional HTML form submission)
      const formData = await request.formData();
      username = formData.get("username") as string;
      password = formData.get("password") as string;

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

      // Redirect to login page with cookie
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/login?registered=true",
          "Set-Cookie": `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return jsonResponse({ error: "Failed to register user" }, 500);
    }
  },
  { name: "my-app:auth-register", path: "/api/auth/register", method: "POST", immutable: false },
);

// POST /api/auth/logout - Logout user (clear cookie)
export const logoutHandler: UniversalHandler<Universal.Context> = enhance(
  async (_request, _context, _runtime) => {
    return new Response(JSON.stringify({
      success: true,
      message: "Successfully logged out",
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Set-Cookie": "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      },
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

// DELETE /api/auth/delete - Delete current user account
export const deleteHandler: UniversalHandler<Universal.Context & { db: DatabaseSync }> = enhance(
  async (request, context, _runtime) => {
    try {
      const user = await getAuthUser(request);
      
      if (!user) {
        return jsonResponse({ error: "Authentication required" }, 401);
      }

      // Delete user from database
      const result = context.db.prepare("DELETE FROM users WHERE id = ?").run(user.userId);
      
      if (result.changes === 0) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      return jsonResponse({ 
        success: true, 
        message: "User deleted successfully" 
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return jsonResponse({ error: "Failed to delete user" }, 500);
    }
  },
  { name: "my-app:auth-delete", path: "/api/auth/delete", method: "DELETE", immutable: false },
);
