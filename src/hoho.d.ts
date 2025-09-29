import 'hono'
import { GoogleGenAI } from "@google/genai";
import { drizzle } from 'drizzle-orm/node-postgres';
import { JWTManager } from '@utils/jwt.manager';
import { User } from 'client/database/schema/user';
import { R2Client } from 'client/r2/r2';
import { LineClient } from '@client/line/line';

declare module 'hono' {
  interface ContextVariableMap {
    chatAi: GoogleGenAI;
    imageGenai: GoogleGenAI;
    db: ReturnType<typeof drizzle>;
    jwtManager: JWTManager;
    r2Client: R2Client;
    lineClient: LineClient;
    
    user: User;
  }
}