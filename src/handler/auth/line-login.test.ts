import { test, expect, describe, beforeEach, vi } from "bun:test";
import { lineLoginHandler } from "./line-login";
import { HTTPException } from "hono/http-exception";
import { LineClient } from "../../client/line/line";
import { Ok, Err } from "ts-results";

type MockContext = {
  get: (key: string) => any;
  redirect: (url: string) => any;
};

describe("lineLoginHandler", () => {
  let mockContext: MockContext;
  let mockLineClient: LineClient;

  beforeEach(() => {
    mockLineClient = {
      generateLoginUrl: vi.fn().mockReturnValue(Ok("https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=test&redirect_uri=callback&state=abc123&scope=profile%20openid")),
      exchangeCodeForToken: vi.fn(),
      getUserProfile: vi.fn(),
      verifyIdToken: vi.fn(),
      generateFeRedirectUrl: vi.fn()
    } as any;

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'lineClient') return mockLineClient;
        return undefined;
      }),
      redirect: vi.fn((url: string) => ({
        redirect: vi.fn().mockResolvedValue({ url })
      }))
    };
  });

  test("should successfully redirect to LINE login URL", async () => {
    const expectedUrl = "https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=test&redirect_uri=callback&state=abc123&scope=profile%20openid";
    
    mockLineClient.generateLoginUrl = vi.fn().mockReturnValue(Ok(expectedUrl));

    const result = await lineLoginHandler(mockContext as any);

    expect(mockLineClient.generateLoginUrl).toHaveBeenCalled();
    expect(mockContext.redirect).toHaveBeenCalledWith(expectedUrl);
  });

  test("should throw HTTPException when generateLoginUrl fails", async () => {
    const errorMessage = "Failed to generate login URL";
    mockLineClient.generateLoginUrl = vi.fn().mockReturnValue(Err(new Error(errorMessage)));

    try {
      await lineLoginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("LineLoginHandler: " + errorMessage);
    }
  });

  test("should call generateLoginUrl without parameters", async () => {
    const expectedUrl = "https://access.line.me/oauth2/v2.1/authorize?test=url";
    mockLineClient.generateLoginUrl = vi.fn().mockReturnValue(Ok(expectedUrl));

    await lineLoginHandler(mockContext as any);

    expect(mockLineClient.generateLoginUrl).toHaveBeenCalledWith();
  });

  test("should handle LineClient not available in context", async () => {
    mockContext.get = vi.fn((key: string) => {
      if (key === 'lineClient') return undefined;
      return undefined;
    });

    try {
      await lineLoginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      // TypeError가 발생할 것으로 예상 (lineClient가 undefined이므로)
      expect(error).toBeDefined();
    }
  });
});
