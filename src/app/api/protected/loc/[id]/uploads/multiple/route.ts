import S3Bucket from '@/libs/server/s3';
import { NextResponse } from 'next/server';

const s3 = new S3Bucket();

export async function POST(request: Request) {
    const data = await request.formData();
    const files = data.getAll('files');
    const fileDirectory = data.get('fileDirectory');
    if (!fileDirectory || !files || Array.isArray(files) && files.length === 0) {
        return NextResponse.json({ message: 'Invalid input or no files provided' }, { status: 400 });
    }

    try {
        await Promise.all(
            files.map(async (file) => {

                if (file instanceof Blob) {
                    const result = await s3.uploadFile(file, fileDirectory as string);
                    console.log(result);
                    return result;
                }
            })
        );
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'File upload failed', error }, { status: 500 });
    }

}
