import { Hono } from 'hono'
import { chatGenaiMiddleware } from '@middleware/chat.genai.inject.middleware';
import { dbMiddleware } from '@middleware/database.inject.middleware';
import * as dotenv from 'dotenv';
import { jwtManagerMiddleware } from '@middleware/jwt.manager.inject.middleware';
import v1Router from '@router/v1';
import { imageGenaiMiddleware } from '@middleware/image.genai.inject.middleware';
import { r2Middleware } from '@middleware/r2.inject.middleware';
import { cors } from 'hono/cors';

dotenv.config({path: '.env'})

const app = new Hono()

app.use('*',cors())

app.use(chatGenaiMiddleware(process.env.CHAT_GEMINI_API_KEY!))
app.use(imageGenaiMiddleware(process.env.IMAGE_GEMINI_API_KEY!))
app.use(dbMiddleware(process.env.DATABASE_URL!))
app.use(jwtManagerMiddleware(process.env.JWT_SECRET!, process.env.JWT_EXPIRES_IN!))
app.use(r2Middleware({
  r2AccountId: process.env.R2_ACCOUNT_ID!,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID!,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  r2BucketName: process.env.R2_BUCKET_NAME!,
  r2PublicDomain: process.env.R2_PUBLICK_URL!
}))

app.route('/v1', v1Router)



export default app
