import { db } from "@/db/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";


export async function POST(req: NextRequest) {
    const { email, password } = await req.json()
    console.log(email, password)
    try {

        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.email, email),
            with: {
                user: true
            }
        });

        if (!vendor || !vendor.user || !vendor.user.password) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
        }


        const match = await bcrypt.compare(password, vendor.user.password)

        if (!match) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
        }






        const LoginUser = {
            ...vendor,
            id: vendor.user.id,
            name: `${vendor.firstName} ${vendor.lastName}`,
        }


        return NextResponse.json({
            user: LoginUser
        }, { status: 200 })

    } catch (error) {
        console.log(error)
        return NextResponse.json({ error }, { status: 500 })
    }
}
