import { GoogleGenAI, Type } from "@google/genai";
import { toGeminiSchema } from "gemini-zod";
import { Err, Ok, Result } from "ts-results";
import { z } from "zod";


export class ChatContent<T extends z.ZodTypeAny> {
    constructor(message: string, typeSchema: T) {
        this.message = message;
        this.typeSchema = typeSchema;
    }

    public readonly message: string;
    public readonly typeSchema: T;
}


/**
 * GoogleGenAI 인스턴스를 받아, 타입-안전 AI 채팅 함수를 반환하는 고차 함수입니다.
 * @param ai GoogleGenAI 클래스의 인스턴스
 * @returns Zod 스키마를 기반으로 타입이 보장된 응답을 반환하는 비동기 함수
 */
export const chat = (ai: GoogleGenAI) => 
    async <T extends z.ZodTypeAny>(content: ChatContent<T>): Promise<Result<z.infer<T>, Error>> => {
        
        const geminiSchema = toGeminiSchema(content.typeSchema);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: content.message,
            config: {
                responseMimeType: "application/json",
                responseSchema: geminiSchema,
            },
        });

        if (!response.text) {
            return Err(new Error('No response text'));
        }

        const responseText = response.text;


        return Ok(content.typeSchema.parse(JSON.parse(responseText)));
    };