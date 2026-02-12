import { db } from "@/db/db";
import { locations } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import S3Bucket from '@/libs/server/s3';

const s3 = new S3Bucket();

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    try {
        const res = await s3.uploadFile(file, `locs/logos`);
        const url = res?.url || null;

        await db.update(locations).set({
            logoUrl: url,
        }).where(eq(locations.id, params.id))


        return NextResponse.json({ url }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const loc = await db.query.locations.findFirst({
            where: (locations, { eq }) => eq(locations.id, params.id),
            columns: {
                logoUrl: true
            }
        })
        if (loc?.logoUrl) {
            await s3.removeFile(`locs/logos`, loc.logoUrl);
            await db.update(locations).set({
                logoUrl: null,
            }).where(eq(locations.id, params.id))
        }
        await db.update(locations).set({
            logoUrl: null,
        }).where(eq(locations.id, params.id))
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}