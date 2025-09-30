import { Context } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { LineClient } from '../../client/line/line';
import { JWTManager } from '../../utils/jwt.manager';
import { users } from '../../client/database/schema/user';

const callbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
});

const errorPrefix = 'LineCallbackHandler: ';

export const lineCallbackHandler = async (c: Context) => {
  try {
    const lineClient = c.get('lineClient') as LineClient;
    const jwtManager = c.get('jwtManager') as JWTManager;
    const db = c.get('db');

    const query = c.req.query();
    const parseResult = callbackQuerySchema.safeParse(query);
    
    if (!parseResult.success) {
      const errorUrl = lineClient.generateFeRedirectUrl(undefined, 'Invalid callback parameters');
      return c.redirect(errorUrl);
    }

    const { code } = parseResult.data;

    const tokenResult = await lineClient.exchangeCodeForToken(code);
    
    if (tokenResult.err) {
      console.error(errorPrefix + tokenResult.val.message);
      const errorUrl = lineClient.generateFeRedirectUrl(undefined, 'Failed to exchange token');
      return c.redirect(errorUrl);
    }

    const tokenData = tokenResult.val;

    const profileResult = await lineClient.getUserProfile(tokenData.access_token);
    
    if (profileResult.err) {
      console.error(errorPrefix + profileResult.val.message);
      const errorUrl = lineClient.generateFeRedirectUrl(undefined, 'Failed to get user profile');
      return c.redirect(errorUrl);
    }

    const profile = profileResult.val;

    let user = await db
      .select()
      .from(users)
      .where(eq(users.lineId, profile.userId))
      .limit(1);

    if (user.length === 0) {
      const [newUser] = await db
        .insert(users)
        .values({
          lineId: profile.userId,
          nickname: profile.displayName,
          profileImageUrl: profile.pictureUrl || null,
          email: null,
          password: null,
          kakaoId: null,
        })
        .returning();

      user = [newUser];
    }

    const jwtResult = jwtManager.generateJWT({ userId: user[0].id });
    
    if (jwtResult.err) {
      console.error(errorPrefix + 'Failed to generate JWT');
      const errorUrl = lineClient.generateFeRedirectUrl(undefined, 'Failed to generate token');
      return c.redirect(errorUrl);
    }

    const successUrl = lineClient.generateFeRedirectUrl(jwtResult.val);
    return c.redirect(successUrl);

  } catch (error) {
    console.error(errorPrefix + error);
    const lineClient = c.get('lineClient') as LineClient;
    const errorUrl = lineClient?.generateFeRedirectUrl(undefined, 'Internal server error') || '/error';
    return c.redirect(errorUrl);
  }
};
