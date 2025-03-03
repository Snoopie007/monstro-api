import { db } from "@/db/db";
import { memberLocations, members, users } from "@/db/schemas";
import { encodeReferralCode } from "@/libs/server/sqids";
import { formatPhoneNumber } from "@/libs/server/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type PackageProps = {
    id: number
}



export async function POST(req: Request, props: { params: Promise<PackageProps> }) {
    const params = await props.params;
    const { progress, ...data } = await req.json();

    try {

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id)
        })


        if (!locationState) {
            return NextResponse.json({ error: "No valid location not found" }, { status: 404 })
        }

        let user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email),
            columns: {
                id: true,
            }
        })

        if (user) {

            return NextResponse.json({ error: "Member already exists with this email." }, { status: 404 })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword: string = await bcrypt.hash(data.password, salt);

        /** Create User */
        const member = await db.transaction(async (tx) => {
            const [{ uid }] = await tx.insert(users).values({
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                password: hashedPassword,
            }).returning({ uid: users.id })
            const [member] = await tx.insert(members).values({
                userId: uid,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: formatPhoneNumber(data.phone),
                referralCode: encodeReferralCode(uid),
            }).returning({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email, phone: members.phone })
            await tx.insert(memberLocations).values({
                locationId: params.id,
                memberId: member.id,
                status: "incomplete",
            })
            return member
        })


        return NextResponse.json(member, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
