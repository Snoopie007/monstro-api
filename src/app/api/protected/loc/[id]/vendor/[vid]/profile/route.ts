import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { vendors } from "@/db/schemas";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

export async function PUT(req: Request) {
    try {
        
        const session = await auth();
        if (!session || !session.user.vendorId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        
        const vendorId = session.user.vendorId;
        const body = await req.json();
        if (!body.firstName || !body.lastName) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
        }

       
        const updatedVendor = await db.update(vendors)
            .set({
                firstName: body.firstName,
                lastName: body.lastName,
            })
            .where(eq(vendors.id, vendorId))
            .returning();

        return NextResponse.json({ 
            success: true, 
            message: "Vendor profile updated successfully.", 
            data: updatedVendor 
        }, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error updating vendor:", error);
        return NextResponse.json({ error: "Failed to update vendor." }, { status: 500 });
    }
}
