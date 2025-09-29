import { profileHandler } from '@handler/user/get-user-profile';
import { authGuardMiddleware } from '@middleware/auth.guard.middleware';
import { Hono } from 'hono';

const userRouter = new Hono()

userRouter.get('/profile', authGuardMiddleware(), profileHandler);

export default userRouter