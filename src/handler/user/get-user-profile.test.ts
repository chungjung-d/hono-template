import { test, expect, describe, beforeEach, vi } from "bun:test";
import { profileHandler } from "./get-user-profile";

type MockContext = {
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("profileHandler", () => {
  let mockContext: MockContext;
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: 1,
      email: "test@example.com",
      nickname: "test-nickname",
      kakaoId: null,
      password: null,
      profileImageUrl: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'user') return mockUser;
        return undefined;
      }),
      json: vi.fn((data: any, status?: number) => ({
        json: vi.fn().mockResolvedValue(data),
        status: status || 200
      }))
    };
  });

  test("should successfully return user profile", async () => {
    const result = await profileHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(mockContext.get).toHaveBeenCalledWith('user');
  });

  test("should return correct response format", async () => {
    const result = await profileHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData).toEqual({
      userId: 1,
      email: "test@example.com",
      nickname: "test-nickname",
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    });
  });

  test("should handle user with null nickname", async () => {
    const userWithNullNickname = {
      ...mockUser,
      nickname: null
    };

    mockContext.get = vi.fn((key: string) => {
      if (key === 'user') return userWithNullNickname;
      return undefined;
    });

    const result = await profileHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData).toEqual({
      userId: 1,
      email: "test@example.com",
      nickname: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    });
  });

  test("should handle user with null email", async () => {
    const userWithNullEmail = {
      ...mockUser,
      email: null
    };

    mockContext.get = vi.fn((key: string) => {
      if (key === 'user') return userWithNullEmail;
      return undefined;
    });

    const result = await profileHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData).toEqual({
      userId: 1,
      email: null,
      nickname: "test-nickname",
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    });
  });

  test("should handle different user data types", async () => {
    const differentUser = {
      id: 999,
      email: "different@example.com",
      nickname: "different-nickname",
      kakaoId: "kakao123",
      password: "hashed-password",
      profileImageUrl: "https://example.com/image.jpg",
      createdAt: new Date('2023-12-25T10:30:00Z'),
      updatedAt: new Date('2023-12-25T15:45:00Z')
    };

    mockContext.get = vi.fn((key: string) => {
      if (key === 'user') return differentUser;
      return undefined;
    });

    const result = await profileHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData).toEqual({
      userId: 999,
      email: "different@example.com",
      nickname: "different-nickname",
      createdAt: new Date('2023-12-25T10:30:00Z'),
      updatedAt: new Date('2023-12-25T15:45:00Z')
    });
  });

  test("should call context.get with 'user' key", async () => {
    await profileHandler(mockContext as any);

    expect(mockContext.get).toHaveBeenCalledWith('user');
    expect(mockContext.get).toHaveBeenCalledTimes(1);
  });

  test("should return 200 status code", async () => {
    const result = await profileHandler(mockContext as any);

    expect(result.status).toBe(200);
  });
});
