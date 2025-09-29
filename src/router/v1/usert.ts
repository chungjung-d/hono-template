import { nicknameHandler } from '@handler/user/create-user-nickname';
import { profileHandler } from '@handler/user/get-user-profile';
import { authGuardMiddleware } from '@middleware/auth.guard.middleware';
import { Hono } from 'hono';

const userRouter = new Hono()

userRouter.get('/profile', authGuardMiddleware(), profileHandler);
userRouter.post('/nickname', authGuardMiddleware(), nicknameHandler);

export default userRouter