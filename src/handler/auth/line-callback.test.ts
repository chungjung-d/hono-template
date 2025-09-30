import { test, expect, describe, beforeEach, vi } from "bun:test";
import { lineCallbackHandler } from "./line-callback";
import { LineClient } from "../../client/line/line";
import { JWTManager } from "../../utils/jwt.manager";
import { Ok, Err } from "ts-results";

type MockContext = {
  req: {
    query: () => any;
  };
  get: (key: string) => any;
  redirect: (url: string) => any;
};

describe("lineCallbackHandler", () => {
  let mockContext: MockContext;
  let mockLineClient: LineClient;
  let mockJWTManager: JWTManager;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 1,
        lineId: "test-line-id",
        nickname: "testuser",
        profileImageUrl: "https://test.com/image.jpg",
        email: null,
        password: null,
        kakaoId: null
      }])
    };

    mockLineClient = {
      generateLoginUrl: vi.fn(),
      exchangeCodeForToken: vi.fn().mockResolvedValue(Ok({
        access_token: "test-access-token",
        token_type: "Bearer",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "profile openid",
        id_token: "test-id-token"
      })),
      getUserProfile: vi.fn().mockResolvedValue(Ok({
        userId: "test-line-id",
        displayName: "testuser",
        pictureUrl: "https://test.com/image.jpg"
      })),
      verifyIdToken: vi.fn(),
      generateFeRedirectUrl: vi.fn((token?: string, error?: string) => {
        if (error) return `https://frontend.com/auth?error=${encodeURIComponent(error)}`;
        if (token) return `https://frontend.com/auth?token=${token}`;
        return "https://frontend.com/auth";
      })
    } as any;

    mockJWTManager = {
      generateJWT: vi.fn().mockReturnValue(Ok("test-jwt-token")),
      verifyJWT: vi.fn(),
      decodeJWT: vi.fn()
    } as any;

    mockContext = {
      req: {
        query: vi.fn().mockReturnValue({
          code: "test-auth-code",
          state: "test-state"
        })
      },
      get: vi.fn((key: string) => {
        if (key === 'lineClient') return mockLineClient;
        if (key === 'jwtManager') return mockJWTManager;
        if (key === 'db') return mockDb;
        return undefined;
      }),
      redirect: vi.fn((url: string) => ({
        redirect: vi.fn().mockResolvedValue({ url })
      }))
    };
  });

  test("should successfully handle callback for new user", async () => {
    // 새 사용자 (기존 사용자 없음)
    mockDb.limit = vi.fn().mockResolvedValue([]);

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.exchangeCodeForToken).toHaveBeenCalledWith("test-auth-code");
    expect(mockLineClient.getUserProfile).toHaveBeenCalledWith("test-access-token");
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockJWTManager.generateJWT).toHaveBeenCalledWith({ userId: 1 });
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?token=test-jwt-token");
  });

  test("should successfully handle callback for existing user", async () => {
    // 기존 사용자
    const existingUser = {
      id: 2,
      lineId: "test-line-id",
      nickname: "existinguser",
      profileImageUrl: "https://test.com/existing.jpg",
      email: null,
      password: null,
      kakaoId: null
    };
    
    mockDb.limit = vi.fn().mockResolvedValue([existingUser]);

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.exchangeCodeForToken).toHaveBeenCalledWith("test-auth-code");
    expect(mockLineClient.getUserProfile).toHaveBeenCalledWith("test-access-token");
    expect(mockDb.insert).not.toHaveBeenCalled(); // 새 사용자 생성하지 않음
    expect(mockJWTManager.generateJWT).toHaveBeenCalledWith({ userId: 2 });
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?token=test-jwt-token");
  });

  test("should redirect with error when query parameters are invalid", async () => {
    // 잘못된 쿼리 파라미터
    mockContext.req.query = vi.fn().mockReturnValue({
      // code가 누락됨
      state: "test-state"
    });

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.generateFeRedirectUrl).toHaveBeenCalledWith(undefined, "Invalid callback parameters");
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Invalid%20callback%20parameters");
  });

  test("should redirect with error when token exchange fails", async () => {
    mockLineClient.exchangeCodeForToken = vi.fn().mockResolvedValue(Err(new Error("Token exchange failed")));

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.generateFeRedirectUrl).toHaveBeenCalledWith(undefined, "Failed to exchange token");
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Failed%20to%20exchange%20token");
  });

  test("should redirect with error when user profile fetch fails", async () => {
    mockLineClient.getUserProfile = vi.fn().mockResolvedValue(Err(new Error("Profile fetch failed")));

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.generateFeRedirectUrl).toHaveBeenCalledWith(undefined, "Failed to get user profile");
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Failed%20to%20get%20user%20profile");
  });

  test("should redirect with error when JWT generation fails", async () => {
    mockJWTManager.generateJWT = vi.fn().mockReturnValue(Err(new Error("JWT generation failed")));

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.generateFeRedirectUrl).toHaveBeenCalledWith(undefined, "Failed to generate token");
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Failed%20to%20generate%20token");
  });

  test("should handle missing authorization code", async () => {
    mockContext.req.query = vi.fn().mockReturnValue({
      code: "", // 빈 문자열
      state: "test-state"
    });

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockLineClient.generateFeRedirectUrl).toHaveBeenCalledWith(undefined, "Invalid callback parameters");
    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Invalid%20callback%20parameters");
  });

  test("should handle general exception", async () => {
    // DB 에러 시뮬레이션
    mockDb.select = vi.fn().mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const result = await lineCallbackHandler(mockContext as any);

    expect(mockContext.redirect).toHaveBeenCalledWith("https://frontend.com/auth?error=Internal%20server%20error");
  });

  test("should create user with correct data structure", async () => {
    // 새 사용자
    mockDb.limit = vi.fn().mockResolvedValue([]);
    
    const profileData = {
      userId: "line-user-123",
      displayName: "Test User",
      pictureUrl: "https://test.com/profile.jpg"
    };
    
    mockLineClient.getUserProfile = vi.fn().mockResolvedValue(Ok(profileData));

    await lineCallbackHandler(mockContext as any);

    expect(mockDb.values).toHaveBeenCalledWith({
      lineId: "line-user-123",
      nickname: "Test User",
      profileImageUrl: "https://test.com/profile.jpg",
      email: null,
      password: null,
      kakaoId: null,
    });
  });

  test("should handle profile without picture URL", async () => {
    // 새 사용자, 프로필 이미지 없음
    mockDb.limit = vi.fn().mockResolvedValue([]);
    
    const profileData = {
      userId: "line-user-123",
      displayName: "Test User"
      // pictureUrl 없음
    };
    
    mockLineClient.getUserProfile = vi.fn().mockResolvedValue(Ok(profileData));

    await lineCallbackHandler(mockContext as any);

    expect(mockDb.values).toHaveBeenCalledWith({
      lineId: "line-user-123",
      nickname: "Test User",
      profileImageUrl: null,
      email: null,
      password: null,
      kakaoId: null,
    });
  });
});
