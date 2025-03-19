import { db } from "@/db/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { decodeId, encodeId } from "@/libs/server/sqids";
export async function POST(req: NextRequest) {
    const { email, password, lid } = await req.json()

    try {

        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.email, email),
            with: {
                user: true
            }
        })
        if (!vendor || !vendor.user || !vendor.user.password) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 })
        }


        const match = await bcrypt.compare(password, vendor.user.password)

        if (!match) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
        }



        let location = null;

        if (lid) {
            const decodedId = decodeId(lid);
            location = await db.query.locations.findFirst({
                where: (locations, { eq, and }) => and(eq(locations.vendorId, vendor.id), eq(locations.id, decodedId)),
                columns: {
                    id: true,
                },
                with: {
                    locationState: {
                        columns: {
                            status: true
                        }
                    }
                }
            })
        }

        if (!location) {
            const locations = await db.query.locations.findMany({
                where: (locations, { eq }) => eq(locations.vendorId, vendor.id),
                columns: {
                    id: true,
                },
                with: {
                    locationState: {
                        columns: {
                            status: true
                        }
                    }
                }
            })
            location = locations.find(loc => loc.locationState.status === 'incomplete' || loc.locationState.status === 'active') || locations[0];
        }

        const LoginUser = {
            ...vendor,
            id: vendor.user.id,
            name: `${vendor.firstName} ${vendor.lastName}`,
        }


        return NextResponse.json({
            user: LoginUser,
            location: location ? {
                id: encodeId(location.id),
                status: location.locationState.status,
            } : { id: null, status: null },
        }, { status: 200 })

    } catch (error) {
        console.log(error)
        return NextResponse.json({ error }, { status: 500 })
    }
}
