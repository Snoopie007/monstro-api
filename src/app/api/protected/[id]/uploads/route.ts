// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import S3Bucket from '@/libs/server/s3';

const s3 = new S3Bucket();

export async function POST(req: NextRequest) {

	const data = await req.formData();
	const file = data.get('file');
	const fileDirectory = data.get('fileDirectory');
	if (!file || !(file instanceof Blob)) {
		return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
	}

	try {
		const res = await s3.uploadFile(file, `${fileDirectory}`);
		return NextResponse.json(res,);

	} catch (error) {
		return NextResponse.json({ message: 'No file uploaded', error: error }, { status: 500 });
	}
}



