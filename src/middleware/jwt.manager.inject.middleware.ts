
import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { MiddlewareHandler } from 'hono';
import { JWTManager } from '@utils/jwt.manager';

let jwtManager: JWTManager;

/**
 * Middleware to inject JWT manager into the Hono context.
 * @returns Hono middleware handler
 */
export const jwtManagerMiddleware = ( secret: string, expiresIn: string ): MiddlewareHandler => {

  if (!jwtManager) {
    jwtManager = new JWTManager(secret, expiresIn);
  }

  return async (c, next) => {
    c.set('jwtManager', jwtManager);
    await next();
  };
};
