import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Err, Ok, Result } from 'ts-results';

export interface R2UploadResult {
    url: string;
    key: string;
}

export type R2Config = {
    r2AccountId: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2BucketName: string;
    r2PublicDomain: string;
}

export class R2Client {
    private client: S3Client;
    private bucketName: string;
    private accountId: string;
    private publicDomain: string;

    constructor(config: R2Config) {
        this.bucketName = config.r2BucketName;
        this.accountId = config.r2AccountId;
        this.publicDomain = config.r2PublicDomain;
        
        this.client = new S3Client({
            region: "auto",
            endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.r2AccessKeyId,
                secretAccessKey: config.r2SecretAccessKey,
            },
        });
    }

    /**
     * Base64 이미지 데이터를 R2에 업로드하고 공개 URL을 반환합니다.
     * @param imageData Base64 인코딩된 이미지 데이터
     * @param mimeType 이미지 MIME 타입
     * @param folder 업로드할 폴더 (기본값: 'images')
     * @returns 업로드된 이미지의 공개 URL과 키
     */
    async uploadImage(
        imageData: string, 
        mimeType: string, 
        folder: string = 'images'
    ): Promise<Result<R2UploadResult, Error>> {
        try {
            // Base64 데이터를 Buffer로 변환
            const imageBuffer = Buffer.from(imageData, 'base64');
            
            // 파일 확장자 결정
            const extension = mimeType.includes('png') ? 'png' : 'jpg';
            
            // 고유한 파일명 생성
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
            
            // R2에 이미지 업로드
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: imageBuffer,
                ContentType: mimeType,
                ACL: 'public-read'
            });

            await this.client.send(uploadCommand);

            const url = `https://${this.publicDomain}/${fileName}`;

            return Ok({
                url,
                key: fileName
            });

        } catch (error) {
            return Err(new Error(`Failed to upload image to R2: ${error}`));
        }
    }

    /**
     * 일반 파일을 R2에 업로드합니다.
     * @param fileBuffer 파일 버퍼
     * @param fileName 파일명
     * @param contentType 파일 타입
     * @param folder 업로드할 폴더 (기본값: 'files')
     * @returns 업로드된 파일의 공개 URL과 키
     */
    async uploadFile(
        fileBuffer: Buffer,
        fileName: string,
        contentType: string,
        folder: string = 'files'
    ): Promise<Result<R2UploadResult, Error>> {
        try {
            const key = `${folder}/${fileName}`;
            
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                ACL: 'public-read'
            });

            await this.client.send(uploadCommand);

            const url = `https://${this.publicDomain}/${key}`;

            return Ok({
                url,
                key
            });

        } catch (error) {
            return Err(new Error(`Failed to upload file to R2: ${error}`));
        }
    }
}
