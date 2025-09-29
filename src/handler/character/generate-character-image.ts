import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { chat } from '../../client/chat/chat';
import { image } from '../../client/image/image';
import { R2Client } from '../../client/r2/r2';
import { ExtractCharacterProfileInfoPrompt, ProfileImageSchema } from '../../utils/prompt/chat/extract-character-profile-info';
import { ProfileImagePrompt } from '../../utils/prompt/image/profile-image';
import { resolve } from '@utils/resolve';

const generateCharacterImageBodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be less than 1000 characters')
});

const errorPrefix = 'GenerateCharacterImageHandler: ';

type Response = {
  characterProfile: {
    tribe: string;
    name: string;
    age: number;
    sexuality: string;
    gender: string;
    composition: string;
    style: string;
    background: string;
    extraDetails: string;
  };
  imageUrl: string;
}

export const generateCharacterImageHandler = async (c: Context) => {
  const body = await c.req.json();
  const parseResult = generateCharacterImageBodySchema.safeParse(body);

  if (!parseResult.success) {
    throw new HTTPException(400, {
      message: errorPrefix + parseResult.error.errors[0].message
    });
  }

  const validatedData = parseResult.data;

  const chatAi = c.get('chatAi');
  const imageAi = c.get('imageGenai');
  const r2Client: R2Client = c.get('r2Client');

  const extractPrompt = new ExtractCharacterProfileInfoPrompt(validatedData.message);
  
  const chatResponse = await chat(chatAi)<typeof ProfileImageSchema>({
    message: extractPrompt.generatePrompt(),
    typeSchema: ProfileImageSchema
  })

  const characterProfile = resolve(chatResponse.mapErr((error) => {
    throw new HTTPException(500, {
      message: errorPrefix + 'Failed to extract character profile info : ' + error.message
    });
  }));

  const imagePrompt = new ProfileImagePrompt(characterProfile);

  const imageResult = await image(imageAi)({
    message: imagePrompt.generatePrompt()
  });

  const generatedImage = resolve(imageResult.mapErr((error) => {
    throw new HTTPException(500, {
      message: errorPrefix + 'Failed to generate character image : ' + error.message
    });
  }));

  const uploadResult = await r2Client.uploadImage(
    generatedImage.imageData,
    generatedImage.mimeType,
    'character-images'
  );

  const imageUrl = resolve(uploadResult.mapErr((error) => {
    throw new HTTPException(500, {
      message: errorPrefix + 'Failed to upload image to R2 : ' + error.message
    });
  }).map((result) => result.url));


  const response: Response = {
    characterProfile,
    imageUrl
  };

  return c.json({ response }, 200);
};
