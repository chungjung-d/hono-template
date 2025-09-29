import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { characters, type NewCharacter } from '../../client/database/schema/character';

const createCharacterBodySchema = z.object({
  name: z.string().min(1, 'Character name is required').max(100, 'Character name must be less than 100 characters'),
  characterImageUrl: z.string().url('Invalid image URL format'),
  personality: z.string().min(1, 'Character personality is required'),
  background: z.string().min(1, 'Character background is required'),
  extraDetails: z.string().optional(),
  summary: z.string().optional()
});

const errorPrefix = 'CreateCharacterHandler: ';

type Response = {
  characterId: number;
  creatorId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createCharacterHandler = async (c: Context) => {
  const body = await c.req.json();
  const parseResult = createCharacterBodySchema.safeParse(body);

  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }

  const validatedData = parseResult.data;

  const db = c.get('db');
  const user = c.get('user');

  if (!user) {
    throw new HTTPException(401, {
      message: errorPrefix + 'User not authenticated'
    });
  }

  const newCharacter: NewCharacter = {
    creatorId: user.id,
    name: validatedData.name,
    characterImageUrl: validatedData.characterImageUrl,
    personality: validatedData.personality,
    background: validatedData.background,
    extraDetails: validatedData.extraDetails || null,
    summary: validatedData.summary || null
  };

  const [createdCharacter] = await db
    .insert(characters)
    .values(newCharacter)
    .returning({
      id: characters.id,
      creatorId: characters.creatorId,
      name: characters.name,
      createdAt: characters.createdAt,
      updatedAt: characters.updatedAt
    });

  const response: Response = {
    characterId: createdCharacter.id,
    creatorId: createdCharacter.creatorId,
    name: createdCharacter.name,
    createdAt: createdCharacter.createdAt,
    updatedAt: createdCharacter.updatedAt
  };

  return c.json({ response }, 201);
};