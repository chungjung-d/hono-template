import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { User, users, type NewUser } from '../../client/database/schema/user';

const registerBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
});

const errorPrefix = 'RegisterHandler: ';

type Response = {
  userId: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export const registerHandler = async (c: Context) => {

    const body = await c.req.json();
    const parseResult = registerBodySchema.safeParse(body);
    
    if (!parseResult.success) {
      throw new HTTPException(400, {
        message: errorPrefix + parseResult.error.errors[0].message
      });
    }
    
    const validatedData = parseResult.data;

    const db = c.get('db');
    
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      throw new HTTPException(400, {
        message: errorPrefix + 'Already exists email'
      });
    }
    
    const hashedPassword = await argon2.hash(validatedData.password);
    
    const newUser: NewUser = {
      email: validatedData.email,
      password: hashedPassword,
      kakaoId: null,
      profileImageUrl: null
    };
    
    const [createdUser] = await db
      .insert(users)
      .values(newUser)
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    const response: Response = {
      userId: createdUser.id,
      email: validatedData.email,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt
    };
    
    return c.json({
      response
    }, 201);
    
};
