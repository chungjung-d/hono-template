import { loginHandler } from '@handler/auth/login';
import { registerHandler } from '@handler/auth/register';
import { lineLoginHandler } from '@handler/auth/line-login';
import { lineCallbackHandler } from '@handler/auth/line-callback';
import { Hono } from 'hono';

const authRouter = new Hono()

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.get('/line/login', lineLoginHandler);
authRouter.get('/line/callback', lineCallbackHandler);

export default authRouter