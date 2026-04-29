export { data }
export type Data = Awaited<ReturnType<typeof data>>

import type { PageContextServer } from 'vike/types';
import type { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'crypto';

async function data(pageContext: PageContextServer) {
  // Access database directly during SSR (same as counter handlers)
  const db = (pageContext as any).db as DatabaseSync | undefined;
  const counterName = 'testpage_counter';
  let initialCount = 0;

  if (db) {
    const row = db.prepare('SELECT value FROM counters WHERE name = ?').get(counterName) as
      | { value: number }
      | undefined;
    console.log('[SSR] Counter from DB:', row);
    if (row) {
      initialCount = row.value;
    } else {
      // Create counter if it doesn't exist
      const counterId = `counter_${randomBytes(16).toString('hex')}`;
      db.prepare('INSERT INTO counters (id, name, value) VALUES (?, ?, ?)').run(counterId, counterName, 0);
    }
  } else {
    console.log('[SSR] No database available');
  }

  console.log('[SSR] initialCount:', initialCount);

  return {
    initialCount,
  };
}
