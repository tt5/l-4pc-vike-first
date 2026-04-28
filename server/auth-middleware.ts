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
