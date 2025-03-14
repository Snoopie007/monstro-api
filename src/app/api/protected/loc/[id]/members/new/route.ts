import { db } from "@/db/db";
import { memberLocations, members, users } from "@/db/schemas";
import { encodeReferralCode } from "@/libs/server/sqids";
import { formatPhoneNumber } from "@/libs/server/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type PackageProps = {
    id: number
}

const INCOMPLETE_PLAN = {
    programId: undefined,
    programLevelId: undefined,
    memberContractId: undefined,
    memberPlanId: undefined,
    currentStep: 1,
    completedSteps: []
}

export async function POST(req: Request, props: { params: Promise<PackageProps> }) {
    const params = await props.params;
    const { invite, ...data } = await req.json();

    try {

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id)
        })


        if (!locationState) {
            return NextResponse.json({ error: "No valid location not found" }, { status: 404 })
        }

        // const [{ exists }] = await db.execute<{ exists: boolean }>(
        //     sql`select exists(${db.select({ n: sql`1` }).from(members).where(eq(members.email, data.email))}) as exists`
        // )

        const existing = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.email, data.email),
            with: {
                memberLocations: true
            }
        })

        if (existing) {
            return NextResponse.json({ existing: true, member: existing }, { status: 200 })
        }

        let user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email),
            columns: {
                id: true,
            }
        })


        if (!user) {
            /** Create User if there isn't one */
            const res = await db.insert(users).values({
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
            }).returning()

            user = res[0]
        }


        const member = await db.transaction(async (tx) => {

            const [member] = await tx.insert(members).values({
                ...data,
                dob: data.dob ? new Date(data.dob) : null,
                userId: user.id,
                phone: formatPhoneNumber(data.phone),
                referralCode: encodeReferralCode(user.id),
            }).returning({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email, phone: members.phone })
            await tx.insert(memberLocations).values({
                locationId: params.id,
                memberId: member.id,
                status: "incomplete",
                incompletePlan: INCOMPLETE_PLAN
            })
            return member
        })



        return NextResponse.json({ existing: false, member }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
