import { NESTED_TRANSACTION_MESSAGE } from '@/data/local/database-port';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';

/**
 * Transaction gate.
 *
 * Two writes that arrive at the same instant must take turns: before the gate,
 * the second was refused with a spurious "nested transaction" error, so a real
 * save failed — a bookmark tapped during a submit, or the deadline's tick racing
 * an answer. These tests hold the line in both directions: a race is queued, and
 * a genuine transaction opened inside another one is still refused.
 */

describe('transaction gate', () => {
  it('lets overlapping writes take turns instead of failing', async () => {
    const db = await openNodeDatabase();
    const order: string[] = [];

    const write = (name: string) =>
      db.transaction(async () => {
        order.push(`${name}:start`);
        // Yield mid-transaction: without the gate, the other write's BEGIN would
        // land here and be refused.
        await Promise.resolve();
        order.push(`${name}:end`);
      });

    await Promise.all([write('first'), write('second')]);

    expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
    await db.close();
  });

  it('still refuses a transaction opened inside another one', async () => {
    const db = await openNodeDatabase({ nestGuardMs: 40 });

    await expect(
      db.transaction(async () => {
        // Wrong, and still refused: composing work atomically passes this
        // transaction down instead of opening another.
        await db.transaction(async () => undefined);
      }),
    ).rejects.toThrow(NESTED_TRANSACTION_MESSAGE);

    // The engine is healthy afterwards: the failed outer work rolled back and
    // the gate kept its line.
    await expect(
      db.transaction(async () => {
        await db.execute('CREATE TABLE gate_probe (id TEXT PRIMARY KEY NOT NULL)');
      }),
    ).resolves.toBeUndefined();
    await db.close();
  });

  it('keeps its turn line when a transaction fails', async () => {
    const db = await openNodeDatabase();

    await expect(
      db.transaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // A rejected transaction rolls back and releases the gate, so the next write
    // runs as usual.
    await expect(
      db.transaction(async () => {
        await db.execute('CREATE TABLE after_failure (id TEXT PRIMARY KEY NOT NULL)');
        await db.execute(`INSERT INTO after_failure (id) VALUES ('one')`);
      }),
    ).resolves.toBeUndefined();
    await db.close();
  });
});
