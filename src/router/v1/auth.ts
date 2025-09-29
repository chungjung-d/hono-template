import { loginHandler } from '@handler/auth/login';
import { registerHandler } from '@handler/auth/register';
import { Hono } from 'hono';

const authRouter = new Hono()

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);

export default authRouter