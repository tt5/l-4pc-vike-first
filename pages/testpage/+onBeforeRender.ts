import type { OnBeforeRenderAsync } from 'vike/types';
import type { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'crypto';

export const onBeforeRender: OnBeforeRenderAsync = async (pageContext) => {
  // Access database directly during SSR (same as counter handlers)
  const db = (pageContext as any).db as DatabaseSync | undefined;
  const counterName = 'testpage_counter';
  let initialCount = 0;

  if (db) {
    const row = db.prepare('SELECT value FROM counters WHERE name = ?').get(counterName) as
      | { value: number }
      | undefined;
    if (row) {
      initialCount = row.value;
    } else {
      // Create counter if it doesn't exist
      const counterId = `counter_${randomBytes(16).toString('hex')}`;
      db.prepare('INSERT INTO counters (id, name, value) VALUES (?, ?, ?)').run(counterId, counterName, 0);
    }
  }

  return {
    pageContext: {
      pageProps: {
        initialCount,
      },
    },
  };
};
