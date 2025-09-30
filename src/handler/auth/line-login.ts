import { Context } from 'hono';
import { LineClient } from '../../client/line/line';
import { HTTPException } from 'hono/http-exception';
import { resolve } from '@utils/resolve';

const errorPrefix = 'LineLoginHandler: ';

export const lineLoginHandler = async (c: Context) => {

  const lineClient = c.get('lineClient') as LineClient;

  const loginUrl = resolve(lineClient.generateLoginUrl()
    .mapErr((error) => new HTTPException(401, { message: errorPrefix + error.message })));

  return c.redirect(loginUrl);
};
