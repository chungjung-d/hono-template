import { GoogleGenAI } from '@google/genai';
import { resolve } from '@utils/resolve';
import { users } from 'client/database/schema/user';
import { eq } from 'drizzle-orm';
import { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';


export const authGuardMiddleware = (): MiddlewareHandler => {

    return async (c, next) => {
        const jwtManager = c.get('jwtManager');
        if (!jwtManager) {
            throw new HTTPException(500, { message: 'AuthGuard: JWT manager not found' });
        }

        const db = c.get('db');
        if (!db) {
            throw new HTTPException(500, { message: 'AuthGuard: Database Client not found' });
        }

        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HTTPException(401, { message: 'AuthGuard: Invalid authorization header' });
        }
        const token = authHeader.substring(7); 

        const decoded = resolve(jwtManager.verifyJWT(token)
            .mapErr((error) => new HTTPException(401, { message: 'AuthGuard: Invalid token' + error.message })));

        const user = await db.select().from(users).where(eq(users.id, decoded.userId));
        if (user.length === 0) {
            throw new HTTPException(401, { message: 'AuthGuard: User not found' });
        }

        c.set('user', user[0]);
        await next();
      };    
};