import { z } from "zod";
import { Prompt } from "../prompt";
import { ProfileImageSchema } from "../image/profile-image";

export class ExtractCharacterProfileInfoPrompt implements Prompt {

    public message: string;

    public constructor(message: string) {
        this.message = message;
    }

    public generatePrompt(): string {
        return `
            you are a artist who can extract the character profile info from the message.
            you will try to make a perfect profile image so you must extract features from the message.

            features:
            - tribe: string
            - name: string
            - age: number
            - sexuality: string
            - gender: string
            - composition: string
            - style: string
            - background: string
            - extraDetails: string

            the extracted information will be delivered image generateor model who can generate a profile image.
            so you must extract the information in a way that is easy for the image generateor model to understand.

            the message is ${this.message}.
        `;
    }

}

export { ProfileImageSchema };