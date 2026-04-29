import "dotenv/config";
import { db } from "../db";

const client = db();

/**
 * Counters table for persistent counter values
 */
client.exec(`CREATE TABLE IF NOT EXISTS counters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    value INTEGER NOT NULL DEFAULT 0,
    created_at_ms INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at_ms INTEGER DEFAULT (strftime('%s', 'now') * 1000)
)`);

// Create index on name for faster lookups
client.exec(`CREATE INDEX IF NOT EXISTS idx_counters_name ON counters(name)`);
