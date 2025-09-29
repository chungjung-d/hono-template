import { MiddlewareHandler } from 'hono';
import { R2Client, R2Config } from '../client/r2/r2';

let r2Client: R2Client;

const errorPrefix = 'R2ClientMiddleware: ';

/**
 * Middleware to create a R2Client instance and inject it into the Context.
 * @param config - R2 configuration including credentials and bucket name
 * @returns Hono middleware handler
 */
export const r2Middleware = (config: R2Config): MiddlewareHandler => {

  if (!r2Client) {
    if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey || !config.r2BucketName || !config.r2PublicDomain) {
      throw new Error(errorPrefix + "R2Config is not available.");
    }

    r2Client = new R2Client(config);
  }

  return async (c, next) => {
    c.set('r2Client', r2Client);
    await next();
  };
};