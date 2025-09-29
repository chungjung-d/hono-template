import { test, expect, describe, beforeEach, vi } from "bun:test";
import { createCharacterHandler } from "./create-character";
import { HTTPException } from "hono/http-exception";

type MockContext = {
  req: {
    json: () => Promise<any>;
  };
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("createCharacterHandler", () => {
  let mockContext: MockContext;
  let mockDb: any;
  let mockUser: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 1,
        name: "Test Character",
        createdAt: new Date(),
        updatedAt: new Date()
      }])
    };

    mockUser = {
      id: 1,
      email: "test@example.com",
      nickname: "testuser"
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

  test("should successfully create character with valid data", async () => {
    const validData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "Friendly and outgoing",
      background: "A brave warrior from the mountains",
      extraDetails: "Likes cats",
      summary: "A kind-hearted character"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await createCharacterHandler(mockContext as any);

    expect(result.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith({
      creatorId: mockUser.id,
      name: validData.name,
      characterImageUrl: validData.characterImageUrl,
      personality: validData.personality,
      background: validData.background,
      extraDetails: validData.extraDetails,
      summary: validData.summary
    });
  });

  test("should create character without optional fields", async () => {
    const validData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "Friendly and outgoing",
      background: "A brave warrior from the mountains"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await createCharacterHandler(mockContext as any);

    expect(result.status).toBe(201);
    expect(mockDb.values).toHaveBeenCalledWith({
      creatorId: mockUser.id,
      name: validData.name,
      characterImageUrl: validData.characterImageUrl,
      personality: validData.personality,
      background: validData.background,
      extraDetails: null,
      summary: null
    });
  });

  test("should throw HTTPException for empty character name", async () => {
    const invalidData = {
      name: "",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "Friendly",
      background: "A warrior"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await createCharacterHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Character name is required");
    }
  });

  test("should throw HTTPException for invalid image URL", async () => {
    const invalidData = {
      name: "Test Character",
      characterImageUrl: "invalid-url",
      personality: "Friendly",
      background: "A warrior"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await createCharacterHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Invalid image URL format");
    }
  });

  test("should throw HTTPException for missing personality", async () => {
    const invalidData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      background: "A warrior"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await createCharacterHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Required");
    }
  });

  test("should throw HTTPException for empty personality", async () => {
    const invalidData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "",
      background: "A warrior"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await createCharacterHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Character personality is required");
    }
  });

  test("should throw HTTPException when user is not authenticated", async () => {
    const validData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "Friendly",
      background: "A warrior"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockContext.get = vi.fn((key: string) => {
      if (key === 'db') return mockDb;
      if (key === 'user') return null; // Not authenticated
      return undefined;
    });

    try {
      await createCharacterHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(401);
      expect((error as HTTPException).message).toContain("User not authenticated");
    }
  });

  test("should return correct response format", async () => {
    const validData = {
      name: "Test Character",
      characterImageUrl: "https://example.com/image.jpg",
      personality: "Friendly",
      background: "A warrior"
    };

    const mockCreatedCharacter = {
      id: 42,
      name: "Test Character",
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    mockDb.returning = vi.fn().mockResolvedValue([mockCreatedCharacter]);
    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await createCharacterHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData.response).toEqual({
      characterId: mockCreatedCharacter.id,
      name: mockCreatedCharacter.name,
      createdAt: mockCreatedCharacter.createdAt,
      updatedAt: mockCreatedCharacter.updatedAt
    });
  });
});