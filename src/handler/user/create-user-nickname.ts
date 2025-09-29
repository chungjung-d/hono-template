import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { User, users } from '../../client/database/schema/user';

const nicknameBodySchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(100, 'Nickname must be less than 100 characters')
});

const errorPrefix = 'NicknameHandler: ';

type Response = {
  nickname: string;
};

export const nicknameHandler = async (c: Context) => {
  const body = await c.req.json();
  const parseResult = nicknameBodySchema.safeParse(body);
  
  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }
  
  const validatedData = parseResult.data;
  const user = c.get('user') as User;
  
  const db = c.get('db');
  
  const [updatedUser] = await db
    .update(users)
    .set({ nickname: validatedData.nickname })
    .where(eq(users.id, user.id))
    .returning({
      nickname: users.nickname,
    });
  
  const response: Response = {
    nickname: updatedUser.nickname as string,
  };
  
  return c.json(response, 200);
};
