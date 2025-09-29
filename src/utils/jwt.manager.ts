import * as jwt from 'jsonwebtoken';
import { Err, Ok, Result } from 'ts-results';

export interface JWTPayload {
  userId: number;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

export class JWTManager {
  private secret: string;
  private expiresIn: string;

  constructor(secret: string, expiresIn: string
  ) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  /**
   * Generate a JWT token
   * @param payload - Payload to include in the JWT
   * @param config - JWT configuration (secret, expiration)
   * @returns Generated JWT token
   */
  public generateJWT(payload: JWTPayload): Result<string, Error> {
    const jwtConfig = { secret: this.secret, expiresIn: this.expiresIn };
    const result = jwt.sign(payload, jwtConfig.secret, { 
      expiresIn: jwtConfig.expiresIn
    } as jwt.SignOptions);

    return Ok(result);
  }

  /**
   * Verify a JWT token and extract the payload
   * @param token - JWT token to verify
   * @returns Verification result and payload
   */
  public verifyJWT(token: string): Result<JWTPayload, Error> {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload;
      return Ok(decoded);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Err(new Error(`verify JWT: ${errorMessage}`));
    }
  }

  /**
   * Extract payload from a JWT token (without verification)
   * @param token - JWT token
   * @returns Payload or null
   */
  public decodeJWT(token: string): Result<JWTPayload, Error> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return Ok(decoded);
    } catch {
      return Err(new Error('decode JWT: Unknown error occurred'));
    }
  }
}