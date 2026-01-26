import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { staffs, users } from '@/db/schemas';
import { eq } from 'drizzle-orm';
import S3Bucket from '@/libs/server/s3';

const s3 = new S3Bucket();

type RouteParams = {
  params: Promise<{
    id: string;
    sid: string;
  }>;
};

export async function POST(req: NextRequest, props: RouteParams) {
  const { sid } = await props.params;

  try {
    const staff = await db.query.staffs.findFirst({
      where: eq(staffs.id, sid),
      columns: {
        userId: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const data = await req.formData();
    const file = data.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const result = await s3.uploadFile(file as File, 'avatars');

    await db.update(users).set({
      image: result.url,
    }).where(eq(users.id, staff.userId));

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: RouteParams) {
  const { sid } = await props.params;

  try {
    const staff = await db.query.staffs.findFirst({
      where: eq(staffs.id, sid),
      columns: {
        userId: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    await db.update(users).set({
      image: null,
    }).where(eq(users.id, staff.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove avatar:', error);
    return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 });
  }
}
