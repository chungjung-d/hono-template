import { GoogleGenAI } from '@google/genai';
import { MiddlewareHandler } from 'hono';

let chatAi: GoogleGenAI;

/**
 * Middleware to create a GoogleGenAI client instance and inject it into the Context.
 * @param apiKey - Gemini API key. This should be provided from process.env, c.env, or other external sources.
 * @returns Hono middleware handler
 */
export const chatGenaiMiddleware = (apiKey: string): MiddlewareHandler => {

  if (!chatAi) {
    if (!apiKey) {
      throw new Error("CHAT_GEMINI_API_KEY is not available.");
    }
    chatAi = new GoogleGenAI({apiKey: apiKey});
  }

  return async (c, next) => {
    c.set('chatAi', chatAi);
    await next();
  };
};