import { test, expect, describe, beforeEach, vi } from "bun:test";
import { registerHandler } from "./register";
import { HTTPException } from "hono/http-exception";
import * as argon2 from 'argon2';

type MockContext = {
  req: {
    json: () => Promise<any>;
  };
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("registerHandler", () => {
  let mockContext: MockContext;
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
        email: "test@example.com",
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }])
    };

    mockContext = {
      req: {
        json: vi.fn()
      },
      get: vi.fn((key: string) => {
        if (key === 'db') return mockDb;
        return undefined;
      }),
      json: vi.fn((data: any, status?: number) => ({
        json: vi.fn().mockResolvedValue(data),
        status: status || 200
      }))
    };

    // argon2.hash를 mock으로 설정
    vi.spyOn(argon2, 'hash').mockResolvedValue('hashed-password');
  });

  test("should successfully register a new user with valid data", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123!"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await registerHandler(mockContext as any);

    expect(result.status).toBe(201);
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
    expect(argon2.hash).toHaveBeenCalledWith(validData.password);
  });

  test("should throw HTTPException for invalid email format", async () => {
    const invalidData = {
      email: "invalid-email",
      password: "password123!"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await registerHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Invalid email format");
    }
  });

  test("should throw HTTPException for password too short", async () => {
    const invalidData = {
      email: "test@example.com",
      password: "123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await registerHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Password must be at least 8 characters long");
    }
  });

  test("should throw HTTPException for password without special character", async () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await registerHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Password must contain at least one special character");
    }
  });

  test("should throw HTTPException when email already exists", async () => {
    const validData = {
      email: "existing@example.com",
      password: "password123!"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    
    mockDb.limit = vi.fn().mockResolvedValue([{ id: 1, email: "existing@example.com" }]);

    try {
      await registerHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Already exists email");
    }
  });

  test("should return correct response format on successful registration", async () => {
    const validData = {
      email: "test@example.com",
      password: "password123!"
    };

    const mockCreatedUser = {
      id: 1,
      email: "test@example.com",
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockDb.returning = vi.fn().mockResolvedValue([mockCreatedUser]);

    const result = await registerHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData.response).toEqual({
      userId: 1,
      email: "test@example.com",
      createdAt: mockCreatedUser.createdAt,
      updatedAt: mockCreatedUser.updatedAt
    });
  });
});
