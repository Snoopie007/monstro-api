import { NextResponse } from 'next/server';
import S3Bucket from "@/libs/server/s3";

export async function GET() {

  try {
    const s3 = new S3Bucket();
    const badges = await s3.listImages('badges');
    return NextResponse.json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
  
}