
import { test, expect } from "bun:test";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { chat, ChatContent } from "./chat";
import { toGeminiSchema } from "gemini-zod";


const userProfileSchema = z.object({
    name: z.string(),
    age: z.number(),
  });
  

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn(" API Key not found");
}


const mockAi = {
  models: {
    generateContent: async (request: any) => {
      return {
        text: JSON.stringify({ name: "Alex", age: 30 }),
      };
    },
  },
} as unknown as GoogleGenAI;
  
  test("[mock]chat function should return an object that matches the Zod schema", async () => {
    const chatWithMockAI = chat(mockAi);
  
    const content = new ChatContent(
      "Generate a random user profile for a person named Alex.",
      userProfileSchema
    );
  
    const result = await chatWithMockAI(content);
    
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      const data = result.val;
      expect(data).toEqual({ name: "Alex", age: 30 });
      
      const validation = userProfileSchema.safeParse(data);
      expect(validation.success).toBe(true);

      expect(data.name).toBe("Alex");
      expect(typeof data.age).toBe("number");
    }
  });