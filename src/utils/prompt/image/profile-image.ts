import { z } from "zod";
import { Prompt } from "../prompt";

export const ProfileImageSchema = z.object({
    tribe: z.string(),
    name: z.string(),
    age: z.number(),
    sexuality: z.string(),
    gender: z.string(),
    composition: z.string(),
    style: z.string(),
    background: z.string(),
    extraDetails: z.string()
});

export class ProfileImagePrompt implements Prompt {

    public tribe: string;
    public name: string;
    public age: number;
    public sexuality: string; 
    public gender: string;
    public composition: string; // Note(Danu): 사진 구도
    public style: string;
    public background: string; // Note(Danu): 배경(인물의 성장 배경 등)
    public extraDetails: string; // Note(Danu): 추가 설명

    public constructor(profileImage : z.infer<typeof ProfileImageSchema>) {
        this.tribe = profileImage.tribe;
        this.name = profileImage.name;
        this.age = profileImage.age;
        this.sexuality = profileImage.sexuality;
        this.gender = profileImage.gender;
        this.composition = profileImage.composition;
        this.style = profileImage.style;
        this.background = profileImage.background;
        this.extraDetails = profileImage.extraDetails;
    }

    public generatePrompt(): string {
        return `
        you are a artist who can generate a profile image.
        you can give me a profile image. (the image must be a square image)
        you must follow the style and composition and sexuality. (the sexuality must under R-rated)

        the character tribe is ${this.tribe}.
        the character name is ${this.name}.
        the character age is ${this.age}.
        the character gender is ${this.gender}.
        the character composition is ${this.composition}.
        the character style is ${this.style}.
        the character background is ${this.background}.
        the character extra details are ${this.extraDetails}.
        the character sexuality is ${this.sexuality}.

        please generate a profile image.
        `;
    }

}