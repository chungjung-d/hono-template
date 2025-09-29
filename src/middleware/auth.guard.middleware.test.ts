import { test, expect, describe, beforeEach, vi } from "bun:test";
import { authGuardMiddleware } from "./auth.guard.middleware";
import { JWTManager, JWTPayload } from "../utils/jwt.manager";
import { HTTPException } from "hono/http-exception";
import { Ok, Err } from "ts-results";

type MockContext = {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  req: {
    header: (name: string) => string | undefined;
  };
};

type MockNext = () => Promise<void>;

describe("authGuardMiddleware", () => {

  let mockJWTManager: JWTManager;
  let mockDb: any;
  let mockContext: MockContext;
  let mockNext: MockNext;
  let middleware: any; 

  beforeEach(() => {
    
    mockJWTManager = {
      verifyJWT: vi.fn(),
    } as any;

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, nickname: "testuser" }]),
    };

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'jwtManager') return mockJWTManager;
        if (key === 'db') return mockDb;
        return undefined;
      }),
      set: vi.fn(),
      req: {
        header: vi.fn(),
      },
    };

    mockNext = vi.fn().mockResolvedValue(undefined);

    middleware = authGuardMiddleware();
  });

  test("should throw HTTPException when JWT manager is not found", async () => {
    mockContext.get = vi.fn((key: string) => {
      if (key === 'jwtManager') return undefined;
      if (key === 'db') return mockDb;
      return undefined;
    });

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toBe("AuthGuard: JWT manager not found");
    }
  });

  test("should throw HTTPException when database client is not found", async () => {
    mockContext.get = vi.fn((key: string) => {
      if (key === 'jwtManager') return mockJWTManager;
      if (key === 'db') return undefined;
      return undefined;
    });

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toBe("AuthGuard: Database Client not found");
    }
  });

  test("should throw HTTPException when Authorization header is missing", async () => {
    mockContext.req.header = vi.fn().mockReturnValue(undefined);

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toBe("AuthGuard: Invalid authorization header");
    }
  });

  test("should throw HTTPException when Authorization header does not start with Bearer", async () => {
    mockContext.req.header = vi.fn().mockReturnValue("invalid-token");

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toBe("AuthGuard: Invalid authorization header");
    }
  });

  test("should throw HTTPException when JWT token is invalid", async () => {
    mockContext.req.header = vi.fn().mockReturnValue("Bearer invalid-token");
    mockJWTManager.verifyJWT = vi.fn().mockReturnValue(Err(new Error("Invalid token")));

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("AuthGuard: Invalid token");
    }
  });

  test("should throw HTTPException when user is not found in database", async () => {
    mockContext.req.header = vi.fn().mockReturnValue("Bearer valid-token");
    mockJWTManager.verifyJWT = vi.fn().mockReturnValue(Ok({ userId: 1 }));
    mockDb.where = vi.fn().mockResolvedValue([]);

    try {
      await middleware(mockContext, mockNext);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toBe("AuthGuard: User not found");
    }
  });

  test("should successfully authenticate and call next()", async () => {
    const mockUser = { id: 1, nickname: "testuser", email: "test@example.com" };
    
    mockContext.req.header = vi.fn().mockReturnValue("Bearer valid-token");
    mockJWTManager.verifyJWT = vi.fn().mockReturnValue(Ok({ userId: 1 }));
    mockDb.where = vi.fn().mockResolvedValue([mockUser]);

    await middleware(mockContext, mockNext);

    expect(mockContext.set).toHaveBeenCalledWith('user', mockUser);
    expect(mockNext).toHaveBeenCalled();
  });
});
