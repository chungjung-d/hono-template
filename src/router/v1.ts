import { Env, Hono } from 'hono';
import authRouter from './v1/auth';
import userRouter from './v1/usert';
import characterRouter from './v1/character';

const v1Router = new Hono<Env>()

v1Router.route('/auth', authRouter);
v1Router.route('/user', userRouter);
v1Router.route('/character', characterRouter);

export default v1Router