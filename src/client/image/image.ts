import { GoogleGenAI } from "@google/genai";
import { Err, Ok, Result } from "ts-results";

export interface ImageGenerationResult {
    imageData: string;
    mimeType: string;
}

export class ImageContent {
    constructor(message: string) {
        this.message = message;
    }
    public readonly message: string;
}

const errorPrefix = 'ImageClient: ';


/**
 * GoogleGenAI 인스턴스를 받아, 이미지 생성 함수를 반환하는 고차 함수입니다.
 * @param ai GoogleGenAI 클래스의 인스턴스
 * @returns 이미지 생성 결과를 반환하는 비동기 함수
 */
export const image = (ai: GoogleGenAI) => 
    async (content: ImageContent): Promise<Result<ImageGenerationResult, Error>> => {
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: content.message,
        });
        
        if (!response.candidates || response.candidates.length === 0) {
            return Err(new Error(errorPrefix + 'No candidates in response'));
        }

        const candidate = response.candidates[0];
        if (!candidate.content || !candidate.content.parts) {
            return Err(new Error(errorPrefix + 'No content parts in response'));
        }

        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                return Ok({
                    imageData: part.inlineData.data || '',
                    mimeType: part.inlineData.mimeType || 'image/png'
                });
            }
        }

        return Err(new Error(errorPrefix + 'No image data found in response'));
    };