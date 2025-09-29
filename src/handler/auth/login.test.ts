import { test, expect, describe, beforeEach, vi } from "bun:test";
import { loginHandler } from "./login";
import { HTTPException } from "hono/http-exception";
import * as argon2 from 'argon2';
import { JWTManager } from "../../utils/jwt.manager";
import { Ok, Err } from "ts-results";

type MockContext = {
  req: {
    json: () => Promise<any>;
  };
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("loginHandler", () => {
  let mockContext: MockContext;
  let mockDb: any;
  let mockJWTManager: JWTManager;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 1,
        email: "test@example.com",
        password: "hashed-password",
        nickname: "testuser",
        profileImageUrl: null
      }])
    };

    mockJWTManager = {
      generateJWT: vi.fn().mockReturnValue(Ok("mock-jwt-token")),
      verifyJWT: vi.fn(),
      decodeJWT: vi.fn()
    } as any;

    mockContext = {
      req: {
        json: vi.fn()
      },
      get: vi.fn((key: string) => {
        if (key === 'db') return mockDb;
        if (key === 'jwtManager') return mockJWTManager;
        return undefined;
      }),
      json: vi.fn((data: any, status?: number) => ({
        json: vi.fn().mockResolvedValue(data),
        status: status || 200
      }))
    };

    vi.spyOn(argon2, 'verify').mockResolvedValue(true);
  });

  test("should successfully login with valid credentials", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await loginHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(mockDb.select).toHaveBeenCalled();
    expect(argon2.verify).toHaveBeenCalledWith("hashed-password", validData.password);
    expect(mockJWTManager.generateJWT).toHaveBeenCalledWith({ userId: 1 });
  });

  test("should throw HTTPException for invalid email format", async () => {
    const invalidData = {
      email: "invalid-email",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Invalid email format");
    }
  });

  test("should throw HTTPException for empty password", async () => {
    const invalidData = {
      email: "test@example.com",
      password: ""
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Password is required");
    }
  });

  test("should throw HTTPException when user is not found", async () => {
    const validData = {
      email: "nonexistent@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockDb.limit = vi.fn().mockResolvedValue([]);

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("Invalid email or password");
    }
  });

  test("should throw HTTPException when user has no password", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockDb.limit = vi.fn().mockResolvedValue([{
      id: 1,
      email: "test@example.com",
      password: null,
      nickname: "testuser",
      profileImageUrl: null
    }]);

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("Invalid email or password");
    }
  });

  test("should throw HTTPException when password is invalid", async () => {
    const validData = {
      email: "test@example.com",
      password: "wrongpassword"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    vi.spyOn(argon2, 'verify').mockResolvedValue(false);

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("Invalid email or password");
    }
  });

  test("should throw HTTPException when JWT generation fails", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockJWTManager.generateJWT = vi.fn().mockReturnValue(Err(new Error("JWT generation failed")));

    try {
      await loginHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to generate token");
    }
  });

  test("should return correct response format on successful login", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await loginHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData.response).toEqual({
      token: "mock-jwt-token"
    });
  });
});
