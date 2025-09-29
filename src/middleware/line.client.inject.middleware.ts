import { LineClient } from '../client/line/line';
import { MiddlewareHandler } from 'hono';

let lineClient: LineClient;

/**
 * Middleware to create a LineClient instance and inject it into the Context.
 * @param config - LINE configuration object
 * @returns Hono middleware handler
 */
export const lineClientMiddleware = (config: {
  lineClientId: string;
  lineClientSecret: string;
  lineCallbackUrl: string;
  lineFeRedirectUrl: string;
}): MiddlewareHandler => {

  if (!lineClient) {
    if (!config.lineClientId || !config.lineClientSecret || !config.lineCallbackUrl || !config.lineFeRedirectUrl) {
      throw new Error("LINE configuration is incomplete. Please check LINE_CLIENT_ID, LINE_CLIENT_SECRET, LINE_CALLBACK_URL, and LINE_FE_REDIRECT_URL.");
    }
    lineClient = new LineClient(config);
  }

  return async (c, next) => {
    c.set('lineClient', lineClient);
    await next();
  };
};
