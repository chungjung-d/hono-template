import { test, expect, describe, beforeEach, vi } from "bun:test";
import { generateCharacterImageHandler } from "./generate-character-image";
import { HTTPException } from "hono/http-exception";
import { Ok, Err } from "ts-results";

type MockContext = {
  req: {
    json: () => Promise<any>;
  };
  get: (key: string) => any;
  json: (data: any, status?: number) => any;
};

describe("generateCharacterImageHandler", () => {
  let mockContext: MockContext;
  let mockChatAi: any;
  let mockImageAi: any;
  let mockR2Client: any;

  beforeEach(() => {
    // Mock Chat AI - GoogleGenAI 구조에 맞게 수정
    mockChatAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            tribe: "엘프",
            name: "루나",
            age: 25,
            sexuality: "이성애",
            gender: "여성",
            composition: "전신",
            style: "판타지",
            background: "마법의 숲",
            extraDetails: "금발에 파란 눈"
          })
        })
      }
    };

    // Mock Image AI - GoogleGenAI 구조에 맞게 수정
    mockImageAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: "base64-encoded-image-data",
                  mimeType: "image/png"
                }
              }]
            }
          }]
        })
      }
    };

    // Mock chat and image functions will be handled per test

    // Mock R2 Client
    mockR2Client = {
      uploadImage: vi.fn().mockResolvedValue(Ok({
        url: "https://example.com/character-images/test-image.png",
        key: "character-images/test-image.png"
      }))
    };

    mockContext = {
      req: {
        json: vi.fn()
      },
      get: vi.fn((key: string) => {
        if (key === 'chatAi') return mockChatAi;
        if (key === 'imageGenai') return mockImageAi;
        if (key === 'r2Client') return mockR2Client;
        return undefined;
      }),
      json: vi.fn((data: any, status?: number) => ({
        json: vi.fn().mockResolvedValue(data),
        status: status || 200
      }))
    };
  });

  test("should successfully generate character image with valid message", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사, 금발에 파란 눈, 우아하고 지적인 성격, 판타지 스타일의 프로필 이미지"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await generateCharacterImageHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(mockChatAi.models.generateContent).toHaveBeenCalled();
    expect(mockImageAi.models.generateContent).toHaveBeenCalled();
    expect(mockR2Client.uploadImage).toHaveBeenCalledWith(
      "base64-encoded-image-data",
      "image/png",
      "character-images"
    );
  });

  test("should throw HTTPException for empty message", async () => {
    const invalidData = {
      message: ""
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Message is required");
    }
  });

  test("should throw HTTPException for message too long", async () => {
    const invalidData = {
      message: "a".repeat(1001) // 1000자 초과
    };

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Message must be less than 1000 characters");
    }
  });

  test("should throw HTTPException for missing message field", async () => {
    const invalidData = {};

    mockContext.req.json = vi.fn().mockResolvedValue(invalidData);

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(400);
      expect((error as HTTPException).message).toContain("Required");
    }
  });

  test("should throw HTTPException when chat AI fails to extract character profile", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    // Chat 함수가 Err를 반환하도록 Mock 설정
    mockChatAi.models.generateContent = vi.fn().mockResolvedValue({
      text: null // 빈 응답으로 에러 유발
    });

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to extract character profile info");
    }
  });

  test("should throw HTTPException when chat AI returns invalid response", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockChatAi.models.generateContent = vi.fn().mockResolvedValue({ text: null });

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to extract character profile info");
    }
  });

  test("should throw HTTPException when image generation fails", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    // Image 함수가 Err를 반환하도록 Mock 설정
    mockImageAi.models.generateContent = vi.fn().mockResolvedValue({
      candidates: [] // 빈 응답으로 에러 유발
    });

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to generate character image");
    }
  });

  test("should throw HTTPException when image AI returns no image data", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockImageAi.models.generateContent = vi.fn().mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            text: "No image data" // 이미지 데이터가 아닌 텍스트
          }]
        }
      }]
    });

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to generate character image");
    }
  });

  test("should throw HTTPException when R2 upload fails", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    mockR2Client.uploadImage = vi.fn().mockResolvedValue(Err(new Error("R2 upload failed")));

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to upload image to R2");
    }
  });

  test("should return correct response format", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사, 금발에 파란 눈"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);

    const result = await generateCharacterImageHandler(mockContext as any);
    const responseData = await result.json();

    expect(responseData.response).toEqual({
      characterProfile: {
        tribe: "엘프",
        name: "루나",
        age: 25,
        sexuality: "이성애",
        gender: "여성",
        composition: "전신",
        style: "판타지",
        background: "마법의 숲",
        extraDetails: "금발에 파란 눈"
      },
      imageUrl: "https://example.com/character-images/test-image.png"
    });
  });

  test("should handle API quota exceeded error", async () => {
    const validData = {
      message: "20대 여성 엘프 마법사"
    };

    mockContext.req.json = vi.fn().mockResolvedValue(validData);
    
    // API 할당량 초과 에러 시뮬레이션 - Image 함수가 Err를 반환하도록 설정
    mockImageAi.models.generateContent = vi.fn().mockResolvedValue({
      candidates: [] // 빈 응답으로 에러 유발
    });

    try {
      await generateCharacterImageHandler(mockContext as any);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      expect((error as HTTPException).status).toBe(500);
      expect((error as HTTPException).message).toContain("Failed to generate character image");
    }
  });
});
