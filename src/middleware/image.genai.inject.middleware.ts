import { GoogleGenAI } from '@google/genai';
import { MiddlewareHandler } from 'hono';

let imageGenai: GoogleGenAI;

/**
 * Middleware to create a GoogleGenAI client instance and inject it into the Context.
 * @param apiKey - Gemini API key. This should be provided from process.env, c.env, or other external sources.
 * @returns Hono middleware handler
 */
export const imageGenaiMiddleware = (apiKey: string): MiddlewareHandler => {

  if (!imageGenai) {
    if (!apiKey) {
      throw new Error("CHAT_GEMINI_API_KEY is not available.");
    }
    imageGenai = new GoogleGenAI({apiKey: apiKey});
  }

  return async (c, next) => {
    c.set('imageGenai', imageGenai);
    await next();
  };
};