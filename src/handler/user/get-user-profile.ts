import { Context } from 'hono';
import { User } from '../../client/database/schema/user';

type Response = {
  userId: number;
  email: string | null;
  nickname: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const profileHandler = async (c: Context) => {
  const user = c.get('user') as User;
  
  const response: Response = {
    userId: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  
  return c.json(response, 200);
};
