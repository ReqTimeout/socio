import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";

const connectionString =
  process.env.SOCIO_DB_URL ??
  `mysql://${process.env.SOCIO_DB_USER}:${process.env.SOCIO_DB_PASS}@${process.env.SOCIO_DB_HOST}:${process.env.SOCIO_DB_PORT}/${process.env.SOCIO_DB_NAME}`;

let pool: mysql.Pool | undefined;
let dbInstance: MySql2Database<typeof schema> | undefined;

// Lazy init: only connect when a DB URL is actually provided.
// This keeps the app buildable / dev-runnable for non-DB routes (e.g. landing
// dashboard UI) without a live database connection.
if (connectionString && connectionString !== "mysql://undefined:undefined@undefined:undefined/undefined") {
  pool = mysql.createPool({
    uri: connectionString,
    connectionLimit: 10,
    charset: "utf8mb4",
  });
  dbInstance = drizzle(pool, { schema, mode: "default" });
}

export const db = dbInstance as MySql2Database<typeof schema>;
export { pool, schema };
