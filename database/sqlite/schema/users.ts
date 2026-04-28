import "dotenv/config";
import { db } from "../db";

const client = db();

/**
 * Users table for authentication
 */
client.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at_ms INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at_ms INTEGER DEFAULT (strftime('%s', 'now') * 1000)
)`);

// Create index on username for faster lookups
client.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
