import { test, expect, describe, beforeEach, vi } from "bun:test";
import { nicknameHandler } from "./create-user-nickname";
import { HTTPException } from "hono/http-exception";

type MockContext = {
  req: {
    json: () => Promise<any>;
  };
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("nicknameHandler", () => {
  let mockContext: MockContext;
  let mockDb: any;
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: 1,
      email: "test@example.com",
      nickname: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    mockDb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        nickname: "new-nickname"
      }])
    };

    mockContext = {
      req: {
        json: vi.fn()
      },
      get: vi.fn((key: string) => {
        if (key === 'db') return mockDb;
        if (key === 'user') return mockUser;
        return undefined;
      }),
      json: vi.fn((data: any, status?: number) => ({
        json: vi.fn().mockResolvedValue(data),
        status: status || 200
      }))
    };
  });

  test("should successfully update nickname with valid data", async () => {
    const validData = {
      nickname: "new-nickname"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await nicknameHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith({ nickname: validData.nickname });
    expect(mockDb.where).toHaveBeenCalled();
  });

  test("should throw HTTPException for empty nickname", async () => {
    const invalidData = {
      nickname: ""
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await nicknameHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Nickname is required");
    }
  });

  test("should throw HTTPException for nickname too long", async () => {
    const invalidData = {
      nickname: "a".repeat(101) 
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await nicknameHandler(mockContext as any);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Nickname must be less than 100 characters");
    }
  });

  test("should throw HTTPException for missing nickname field", async () => {
    const invalidData = {};

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await nicknameHandler(mockContext as any);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Required");
    }
  });

  test("should return correct response format on successful nickname update", async () => {
    const validData = {
      nickname: "new-nickname"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await nicknameHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData).toEqual({
      nickname: "new-nickname"
    });
  });

  test("should handle database update correctly", async () => {
    const validData = {
      nickname: "test-nickname"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    await nicknameHandler(mockContext as any);

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith({ nickname: "test-nickname" });
    expect(mockDb.where).toHaveBeenCalled();
    expect(mockDb.returning).toHaveBeenCalledWith({
      nickname: expect.any(Object)
    });
  });
});
