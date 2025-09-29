import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { MiddlewareHandler } from 'hono';

let db: ReturnType<typeof drizzle>;

/**
 * Middleware to inject database client into the Hono context.
 * @returns Hono middleware handler
 */
export const dbMiddleware = ( databaseUrl: string ): MiddlewareHandler => {

  if (!db) {
    const pool = new Pool({
      connectionString: databaseUrl,
    });
    db = drizzle({ client: pool });
  }

  return async (c, next) => {
    c.set('db', db);
    await next();
  };
};
