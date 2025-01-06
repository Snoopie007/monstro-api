// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {

	const data = await request.formData();
	const file = data.get('file');
	const fileDirectory = data.get('fileDirectory');

	if (file && file instanceof Blob) {
		const REGION = process.env.AWS_REGION;
		const s3Client = new S3Client({
			region: REGION ? REGION : '',
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID : '',
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? process.env.AWS_SECRET_ACCESS_KEY : '',
			}
		})
		const fileBody = await file.arrayBuffer(); // Converts File to ArrayBuffer
		const buffer = Buffer.from(fileBody);
		const uploadParams = {
			Bucket: "monstro-bucket",
			Key: `${fileDirectory}/${file.name}`, // The file name in the S3 bucket
			Body: buffer,
			ContentType: file.type, // MIME type of the file
		};
		try {
			const result = await s3Client.send(new PutObjectCommand(uploadParams));
			console.log(result)
			const fileUrl = `https://${uploadParams.Bucket}.s3.${REGION}.amazonaws.com/${uploadParams.Key}`;
			return NextResponse.json({ status: 'success', message: 'File uploaded successfully', data: { ...result, url: fileUrl } });
		} catch (error) {
			return NextResponse.json({ status: 'fail', message: 'No file uploaded', error: error }, { status: 500 });
		}

	}

}
