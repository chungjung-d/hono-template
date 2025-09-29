import { Context } from 'hono';
import { LineClient } from '../../client/line/line';

const errorPrefix = 'LineLoginHandler: ';

export const lineLoginHandler = async (c: Context) => {
  try {
    const lineClient = c.get('lineClient') as LineClient;

    const loginUrl = lineClient.generateLoginUrl();
    
    return c.redirect(loginUrl);
    
  } catch (error) {
    console.error(errorPrefix + error);
    return c.json({
      error: errorPrefix + 'Failed to generate login URL'
    }, 500);
  }
};
