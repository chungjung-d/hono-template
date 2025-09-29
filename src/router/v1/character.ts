import { createCharacterHandler } from '@handler/character/create-character';
import { generateCharacterImageHandler } from '@handler/character/generate-character-image';
import { authGuardMiddleware } from '@middleware/auth.guard.middleware';
import { chatGenaiMiddleware } from '@middleware/chat.genai.inject.middleware';
import { imageGenaiMiddleware } from '@middleware/image.genai.inject.middleware';
import { r2Middleware } from '@middleware/r2.inject.middleware';
import { Hono } from 'hono';

const characterRouter = new Hono()

characterRouter.post('/', authGuardMiddleware(), createCharacterHandler);

characterRouter.post('/generate-image', 
    authGuardMiddleware(),
    generateCharacterImageHandler
);

export default characterRouter