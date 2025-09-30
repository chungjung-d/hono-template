import { Err, Ok, Result } from 'ts-results';

export interface LineConfig {
    lineClientId: string;
    lineClientSecret: string;
    lineCallbackUrl: string;
    lineFeRedirectUrl: string;
}

export interface LineTokenResponse {
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
}

export interface LineProfileResponse {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

export interface LineLoginUrlParams {
    state?: string;
    nonce?: string;
}

const errorPrefix = 'LineClient: ';

export class LineClient {
    private clientId: string;
    private clientSecret: string;
    private callbackUrl: string;
    private feRedirectUrl: string;
    private baseUrl = 'https://api.line.me';

    constructor(config: LineConfig) {
        this.clientId = config.lineClientId;
        this.clientSecret = config.lineClientSecret;
        this.callbackUrl = config.lineCallbackUrl;
        this.feRedirectUrl = config.lineFeRedirectUrl;
    }

    /**
     * LINE 로그인 URL을 생성합니다.
     * @param params 추가 파라미터 (state, nonce)
     * @returns LINE 로그인 URL
     */
    generateLoginUrl(params: LineLoginUrlParams = {}): Result<string, Error> {
        const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
        
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', this.clientId);
        url.searchParams.set('redirect_uri', this.callbackUrl);
        url.searchParams.set('state', params.state || this.generateRandomString());
        url.searchParams.set('scope', 'profile openid');
        
        if (params.nonce) {
            url.searchParams.set('nonce', params.nonce);
        }

        return Ok(url.toString());
    }

    /**
     * 인증 코드를 액세스 토큰으로 교환합니다.
     * @param code 인증 코드
     * @returns 토큰 정보
     */
    async exchangeCodeForToken(code: string): Promise<Result<LineTokenResponse, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/oauth2/v2.1/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.callbackUrl,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return Err(new Error(`${errorPrefix}Token exchange failed: ${response.status} ${errorText}`));
            }

            const tokenData = await response.json() as LineTokenResponse;
            return Ok(tokenData);

        } catch (error) {
            return Err(new Error(`${errorPrefix}Token exchange error: ${error}`));
        }
    }

    /**
     * 액세스 토큰을 사용하여 사용자 프로필을 조회합니다.
     * @param accessToken 액세스 토큰
     * @returns 사용자 프로필 정보
     */
    async getUserProfile(accessToken: string): Promise<Result<LineProfileResponse, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/v2/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                return Err(new Error(`${errorPrefix}Profile fetch failed: ${response.status} ${errorText}`));
            }

            const profileData = await response.json() as LineProfileResponse;
            return Ok(profileData);

        } catch (error) {
            return Err(new Error(`${errorPrefix}Profile fetch error: ${error}`));
        }
    }

    /**
     * ID 토큰을 검증하고 디코딩합니다.
     * @param idToken ID 토큰
     * @returns 디코딩된 토큰 정보
     */
    async verifyIdToken(idToken: string): Promise<Result<any, Error>> {
        try {
            const response = await fetch(`${this.baseUrl}/oauth2/v2.1/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    id_token: idToken,
                    client_id: this.clientId,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return Err(new Error(`${errorPrefix}ID token verification failed: ${response.status} ${errorText}`));
            }

            const tokenData = await response.json();
            return Ok(tokenData);

        } catch (error) {
            return Err(new Error(`${errorPrefix}ID token verification error: ${error}`));
        }
    }

    /**
     * 프론트엔드로 리다이렉트할 URL을 생성합니다.
     * @param token JWT 토큰
     * @param error 에러 메시지 (선택사항)
     * @returns 프론트엔드 리다이렉트 URL
     */
    generateFeRedirectUrl(token?: string, error?: string): string {
        const url = new URL(this.feRedirectUrl);
        
        if (token) {
            url.searchParams.set('token', token);
        }
        
        if (error) {
            url.searchParams.set('error', error);
        }
        
        return url.toString();
    }

    /**
     * 랜덤 문자열을 생성합니다 (state 파라미터용).
     * @param length 문자열 길이
     * @returns 랜덤 문자열
     */
    private generateRandomString(length: number = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
