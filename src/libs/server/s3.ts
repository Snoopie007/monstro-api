import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { tryCatch } from "../utils";

export default class S3Bucket {
    private s3Client: S3Client;
    private REGION = process.env.AWS_REGION || '';

    constructor() {
        this.s3Client = new S3Client({
            region: this.REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        });
    }

    /**
     * Uploads a file to AWS S3 bucket
     * @param file - The file object to upload
     * @param fileDirectory - The directory path in S3 where the file should be stored
     * @returns Object containing the upload result and the public URL of the uploaded file
     * @throws Error if upload fails
     */
    async uploadFile(file: File, fileDirectory: string) {
        /** Convert the File object to a Buffer that S3 can handle */
        const fileBody = await file.arrayBuffer();
        const buffer = Buffer.from(fileBody);

        /** Prepare the parameters for S3 upload */
        const uploadParams = {
            Bucket: 'monstro-bucket',
            Key: `${fileDirectory}/${file.name}`, /** Full path including filename in S3 */
            Body: buffer,
            ContentType: file.type, /** Sets proper MIME type for serving the file */
        };

        /** Create a managed upload for better control */
        const command = new PutObjectCommand(uploadParams);

        /** Attempt to upload the file to S3 */
        const { result, error } = await tryCatch(this.s3Client.send(command));

        if (error) throw error;

        /** Return the upload result along with the public URL of the file */
        return {
            url: `https://${uploadParams.Bucket}.s3.${this.REGION}.amazonaws.com/${uploadParams.Key}`,
        };
    }

    async removeFile(fileDirectory: string, name: string) {
        const command = new DeleteObjectCommand({ Bucket: 'monstro-bucket', Key: `${fileDirectory}/${name}` })
        const { result, error } = await tryCatch(this.s3Client.send(command))
        if (error) throw error;
        return result;
    }

}
