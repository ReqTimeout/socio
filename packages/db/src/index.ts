import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";

function resolveConnectionString(): string | undefined {
  return (
    process.env.SOCIO_DB_URL ??
    (process.env.SOCIO_DB_USER
      ? `mysql://${process.env.SOCIO_DB_USER}:${process.env.SOCIO_DB_PASS}@${process.env.SOCIO_DB_HOST}:${process.env.SOCIO_DB_PORT}/${process.env.SOCIO_DB_NAME}`
      : undefined)
  );
}

let dbInstance: MySql2Database<typeof schema> | undefined;

/** Lazily create the Drizzle instance on first use (env may not be ready at import time). */
export function getDb(): MySql2Database<typeof schema> {
  if (!dbInstance) {
    const connectionString = resolveConnectionString();
    if (!connectionString || connectionString.includes("undefined")) {
      throw new Error(
        "SOCIO_DB_URL is not set — cannot connect to the database.",
      );
    }
    const pool = mysql.createPool({
      uri: connectionString,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
    dbInstance = drizzle(pool, { schema, mode: "default" });
  }
  return dbInstance;
}

/**
 * `db` proxy that forwards to the lazily-initialised instance. This keeps
 * `import { db } from "@socio/db"` ergonomic while deferring connection setup
 * until env vars are guaranteed to be loaded.
 */
export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_t, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
  has(_t, prop) {
    return prop in getDb();
  },
}) as MySql2Database<typeof schema>;

export { schema };
