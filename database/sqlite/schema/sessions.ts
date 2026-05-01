import "dotenv/config";
import { db } from "../db";

const client = db();

/**
 * Sessions table for server-side session tracking
 */
client.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at_ms INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    expires_at_ms INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// Create index on token_hash for faster lookups
client.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`);

// Create index on user_id for listing user sessions
client.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);

// Create index on expires_at_ms for cleanup queries
client.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at_ms)`);
