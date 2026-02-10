import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2Command,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { tryCatch } from "./utils";

type Result = {
	key: string;
	url: string;
};

export default class S3Bucket {
	private s3Client: S3Client;
	private REGION = process.env.AWS_REGION || "us-east-1";
	private BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "monstro-bucket";

	constructor() {
		this.s3Client = new S3Client({
			region: this.REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
			},
		});
	}

	public get client(): S3Client {
		return this.s3Client;
	}
	/**
	 * Determines content type from file extension
	 * @param key - The S3 key/path of the file
	 * @returns MIME type based on file extension
	 */
	public getContentTypeFromKey(key: string): string {
		const extension = key.split(".").pop()?.toLowerCase();
		const mimeTypes: Record<string, string> = {
			pdf: "application/pdf",
			doc: "application/msword",
			docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			xls: "application/vnd.ms-excel",
			xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			png: "image/png",
			gif: "image/gif",
			mp4: "video/mp4",
			mov: "video/quicktime",
			avi: "video/x-msvideo",
			txt: "text/plain",
			csv: "text/csv",
			json: "application/json",
			zip: "application/zip",
		};
		return mimeTypes[extension || ""] || "application/octet-stream";
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
			Bucket: this.BUCKET_NAME,
			Key: `${fileDirectory}/${file.name}` /** Full path including filename in S3 */,
			Body: buffer,
			ContentType: file.type /** Sets proper MIME type for serving the file */,
		};

		/** Create a managed upload for better control */
		const command = new PutObjectCommand(uploadParams);

		/** Attempt to upload the file to S3 */
		const { error } = await tryCatch(this.s3Client.send(command));

		if (error) throw error;

		/** Return the upload result along with the public URL of the file */
		return {
			url: `https://${uploadParams.Bucket}.s3.${this.REGION}.amazonaws.com/${uploadParams.Key}`,
		};
	}

	async removeFile(fileDirectory: string, name: string) {
		const command = new DeleteObjectCommand({
			Bucket: this.BUCKET_NAME,
			Key: `${fileDirectory}/${name}`,
		});
		const { error } = await tryCatch(this.s3Client.send(command));
		if (error) throw error;
		return true;
	}

	/**
	 * Lists all files in a specific directory of the S3 bucket
	 * @param directory - The directory path in S3 (e.g., 'badges')
	 * @returns Array of public URLs for the files
	 */

	async listImages(directory: string): Promise<Result[]> {
		const command = new ListObjectsV2Command({
			Bucket: this.BUCKET_NAME,
			Prefix: directory + "/", // Ensure it ends with a slash
		});

		const { result, error } = await tryCatch(this.s3Client.send(command));

		if (error) throw error;

		if (!result?.Contents) return [];

		// Filter out the directory itself and map to public URLs
		return result.Contents.filter((item) => item.Key !== directory + "/") // Exclude the directory itself
			.map((item) => ({
				key: item.Key || "",
				url: `https://${this.BUCKET_NAME}.s3.${this.REGION}.amazonaws.com/${item.Key}`,
			}));
	}

	/**
	 * Uploads raw data/buffer to AWS S3 bucket
	 * @param data - The buffer or data to upload
	 * @param key - The full S3 key/path for the file
	 * @param contentType - The MIME type of the content
	 * @returns Object containing the upload result and the public URL of the uploaded file
	 * @throws Error if upload fails
	 */
	async uploadBuffer(
		data: Buffer | Uint8Array,
		key: string,
		contentType?: string
	) {
		// Validate input data
		if (!data || data.length === 0) {
			throw new Error("Upload data is empty or undefined");
		}

		// Convert to Buffer if needed for AWS SDK v3 compatibility
		const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

		// Determine content type from file extension if not provided
		const determinedContentType =
			contentType || this.getContentTypeFromKey(key);

		const uploadParams = {
			Bucket: this.BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: determinedContentType,
			ContentLength: buffer.length, // Explicitly set content length
		};

		const command = new PutObjectCommand(uploadParams);
		const { error } = await tryCatch(this.s3Client.send(command));

		if (error) {
			console.error("S3 upload error:", error);
			throw new Error(
				`S3 upload failed: ${error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}

		return {
			url: `https://${this.BUCKET_NAME}.s3.${this.REGION}.amazonaws.com/${key}`,
		};
	}

	/**
	 * Generates a signed URL for downloading a file from S3
	 * @param key - The S3 key/path of the file
	 * @param expiresIn - Expiration time in seconds (default: 5 minutes)
	 * @param forceDownload - Whether to force download with proper headers
	 * @returns Signed URL for downloading the file
	 * @throws Error if URL generation fails
	 */
	async getSignedUrl(
		key: string,
		expiresIn: number = 300,
		forceDownload: boolean = true
	) {
		const filename = key.split("/").pop() || "download";
		const contentType = this.getContentTypeFromKey(key);

		const command = new GetObjectCommand({
			Bucket: this.BUCKET_NAME,
			Key: key,
			...(forceDownload && {
				ResponseContentDisposition: `attachment; filename="${filename}"`,
				ResponseContentType: contentType,
			}),
		});

		const { result: url, error } = await tryCatch(
			getSignedUrl(this.s3Client, command, { expiresIn })
		);

		if (error) throw error;

		return url;
	}



	/**
	 * Generates a presigned URL for direct client-to-S3 upload
	 * @param fileDirectory - The directory path in S3 where the file should be stored
	 * @param fileName - The name of the file
	 * @param contentType - The MIME type of the file
	 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
	 * @returns Presigned URL for PUT request and the public URL
	 */
	async getPresignedUploadUrl(
		fileDirectory: string,
		fileName: string,
		contentType: string,
		expiresIn: number = 300
	): Promise<{ uploadUrl: string; publicUrl: string }> {
		const key = `${fileDirectory}/${fileName}`;

		const command = new PutObjectCommand({
			Bucket: this.BUCKET_NAME,
			Key: key,
			ContentType: contentType,
		});

		const { result: uploadUrl, error } = await tryCatch(
			getSignedUrl(this.s3Client, command, { expiresIn })
		);

		if (!uploadUrl) throw new Error("Failed to generate upload URL");

		if (error) throw error;

		const publicUrl = `https://${this.BUCKET_NAME}.s3.${this.REGION}.amazonaws.com/${key}`;

		return { uploadUrl, publicUrl };
	}
}
