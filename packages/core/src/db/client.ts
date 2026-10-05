import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { env } from "../env";

type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __onbrandDb?: DB; __onbrandSql?: postgres.Sql };

export function getSql(): postgres.Sql {
  if (!g.__onbrandSql) {
    const url = env.databaseUrl;
    const isLocal = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    g.__onbrandSql = postgres(url, {
      max: Number(process.env.DB_POOL_MAX ?? 5),
      ssl: isLocal ? false : "require",
      prepare: false,
      onnotice: () => {},
    });
  }
  return g.__onbrandSql;
}

export function getDb(): DB {
  if (!g.__onbrandDb) g.__onbrandDb = drizzle(getSql(), { schema });
  return g.__onbrandDb;
}

/** Lazily-connected Drizzle instance (no connection until first query). */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export { schema };
