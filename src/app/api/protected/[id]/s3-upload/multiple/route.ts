import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
    const data = await request.formData();
    const files = data.getAll('files'); // Get all files from the form
    const fileDirectory = data.get('fileDirectory');

    if (files && Array.isArray(files) && fileDirectory) {
        const REGION = process.env.AWS_REGION;
        const s3Client = new S3Client({
            region: REGION || '',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        });
        try {
            // Process each file
            const uploadResults = await Promise.all(
                files.map(async (file) => {
                    if (file instanceof Blob) {
                        const fileBody = await file.arrayBuffer();
                        const buffer = Buffer.from(fileBody);
                        const uploadParams = {
                            Bucket: "monstro-bucket",
                            Key: `${fileDirectory}/${file.name}`, // The file name in the S3 bucket
                            Body: buffer,
                            ContentType: file.type, // MIME type of the file
                        };
                        const result = await s3Client.send(new PutObjectCommand(uploadParams));
                        const fileUrl = `https://${uploadParams.Bucket}.s3.${REGION}.amazonaws.com/${uploadParams.Key}`;
                        return {
                            name: file.name,
                            url: fileUrl,
                            result,
                        };
                    }
                })
            );
            return NextResponse.json({
                status: 'success',
                message: 'Files uploaded successfully',
                data: uploadResults,
            });
        } catch (error) {
            return NextResponse.json(
                { status: 'fail', message: 'File upload failed', error },
                { status: 500 }
            );
        }
    }
    return NextResponse.json(
        { status: 'fail', message: 'Invalid input or no files provided' },
        { status: 400 }
    );
}
