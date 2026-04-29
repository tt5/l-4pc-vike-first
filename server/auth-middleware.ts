import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { getAuthUser, type TokenPayload } from "../lib/server/auth/jwt";

declare global {
  namespace Universal {
    interface Context {
      user: TokenPayload | null;
    }
  }
}

// Add the `user` object to the context if authenticated
export const authMiddleware: UniversalMiddleware = enhance(
  async (request, context, _runtime) => {
    const user = await getAuthUser(request);

    return {
      ...context,
      // Sets pageContext.user
      user: user,
    };
  },
  {
    name: "my-app:auth-middleware",
    immutable: false,
  },
);

// Helper function to require authentication
export function requireAuth(context: Universal.Context): TokenPayload {
  if (!context.user) {
    throw new Error("Unauthorized");
  }
  return context.user;
}

// Protected route middleware - redirects to login if not authenticated
export const protectedMiddleware: UniversalMiddleware = enhance(
  async (request, context, _runtime) => {
    // Check if user is authenticated
    if (!context.user) {
      // Only redirect on HTML page requests, not on pageContext.json requests
      const url = new URL(request.url);
      if (!url.pathname.includes('pageContext.json')) {
        // Redirect to login page
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/login",
          },
        });
      }
      // For pageContext.json requests, let them continue (client-side will handle auth)
    }

    // User is authenticated, continue
    return context;
  },
  {
    name: "my-app:protected",
    path: "/dashboard",
    method: "GET",
    immutable: false,
  },
);
