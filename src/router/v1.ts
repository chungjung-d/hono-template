import { Env, Hono } from 'hono';
import authRouter from './v1/auth';
import userRouter from './v1/user';

const v1Router = new Hono<Env>()

v1Router.route('/auth', authRouter);
v1Router.route('/user', userRouter);

export default v1Router