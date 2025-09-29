import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { User, users } from '../../client/database/schema/user';
import { JWTManager } from '../../utils/jwt.manager';

const loginBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const errorPrefix = 'LoginHandler: ';

type Response = {
  token: string;
}

export const loginHandler = async (c: Context) => {
  const body = await c.req.json();
  const parseResult = loginBodySchema.safeParse(body);
  
  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }
  
  const validatedData = parseResult.data;

  const db = c.get('db');
  const jwtManager = c.get('jwtManager') as JWTManager;
  
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, validatedData.email))
    .limit(1);
  
  if (existingUser.length === 0) {
    throw new HTTPException(401, {
      message: errorPrefix + 'Invalid email or password'
    });
  }
  
  const user = existingUser[0];
  
  if (!user.password) {
    throw new HTTPException(401, {
      message: errorPrefix + 'Invalid email or password'
    });
  }
  
  const isPasswordValid = await argon2.verify(user.password, validatedData.password);
  
  if (!isPasswordValid) {
    throw new HTTPException(401, {
      message: errorPrefix + 'Invalid email or password'
    });
  }
  
  const jwtResult = jwtManager.generateJWT({ userId: user.id });
  
  if (jwtResult.err) {
    throw new HTTPException(500, {
      message: errorPrefix + 'Failed to generate token'
    });
  }
  
  const response: Response = {
    token: jwtResult.val,
  };
  
  return c.json({
    response
  }, 200);
};
