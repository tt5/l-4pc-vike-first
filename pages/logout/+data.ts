export { data }
export type Data = Awaited<ReturnType<typeof data>>

import type { PageContextServer } from 'vike/types';
import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'crypto';

async function data(pageContext: PageContextServer) {
  const urlParsed = pageContext.urlParsed;
  const isSuccess = urlParsed.search?.success === 'true';
  const db = (pageContext as any).db as DatabaseSync | undefined;

  // Check if user has an active session in the database
  let isLoggedIn = false;
  let user: { id: string; username: string } | null = null;

  if (db) {
    // Get auth token from cookie
    const cookieHeader = pageContext.headers?.cookie || '';
    const authToken = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith('auth-token='))
      ?.split('=')[1];

    if (authToken) {
      const tokenHash = createHash("sha256").update(authToken).digest("hex");
      const now = Date.now();

      // Look up active session
      const session = db.prepare(
        `SELECT s.user_id, u.username
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = ? AND s.expires_at_ms > ?`
      ).get(tokenHash, now) as { user_id: string; username: string } | undefined;

      if (session) {
        isLoggedIn = true;
        user = { id: session.user_id, username: session.username };
      }
    }
  }

  return {
    isSuccess,
    isLoggedIn,
    user,
  };
}
