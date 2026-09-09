export type D1Result = { success?: boolean; results?: unknown[]; meta?: unknown };

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  exec(query: string): Promise<D1Result>;
}

let bootstrapPromise: Promise<void> | null = null;

// Production schema and seed data are managed by D1 migrations during deploy.
// Runtime requests only verify that the migrated database is reachable.
export async function ensureDatabase(db: D1DatabaseLike): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await db.prepare('SELECT version FROM schema_meta ORDER BY version DESC LIMIT 1').first<{ version: number }>();
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}
