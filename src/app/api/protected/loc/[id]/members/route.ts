import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import { memberLocations, members, users } from "@/db/schemas";
import { formatPhoneNumber } from "@/libs/server/db";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  const { searchParams } = new URL(req.url);

  const pageSize = parseInt(searchParams.get("size") || "100");
  const page = parseInt(searchParams.get("page") || "1");
  const query = searchParams.get("query") || ""; // Search string

  try {
    const session = await auth();

    if (session) {
      // Base condition: Filter by locationId from memberLocations
      const baseCondition = eq(memberLocations.locationId, params.id);

      // Optional search condition for members (case-insensitive match)
      const searchCondition = query
        ? or(
            ilike(members.firstName, `%${query}%`), // Match firstName
            ilike(members.lastName, `%${query}%`) // Match lastName
          )
        : undefined;

      // Fetch members with search and base conditions
      const membersResult = await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          phone: members.phone,
          avatar: members.avatar,
          memberLocation: {
            status: memberLocations.status,
          },
        })
        .from(memberLocations)
        .innerJoin(members, eq(memberLocations.memberId, members.id)) // Join with members table
        .where(
          searchCondition ? and(baseCondition, searchCondition) : baseCondition
        ) // Combine conditions
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // Fetch the total count (with the same conditions)
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(memberLocations)
        .innerJoin(members, eq(memberLocations.memberId, members.id))
        .where(
          searchCondition ? and(baseCondition, searchCondition) : baseCondition
        );

      const totalCount = totalCountResult[0]?.count || 0;

      // Return the paginated result and total count
      return NextResponse.json(
        {
          count: totalCount,
          members: membersResult,
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

const INCOMPLETE_PLAN = {
  programId: undefined,
  memberContractId: undefined,
  memberPlanId: undefined,
  currentStep: 1,
  completedSteps: [],
};

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { invite, ...data } = await req.json();

  try {
    const locationState = await db.query.locationState.findFirst({
      where: (locationState, { eq }) => eq(locationState.locationId, params.id),
    });

    if (!locationState) {
      return NextResponse.json(
        { error: "No valid location not found" },
        { status: 404 }
      );
    }

    // const [{ exists }] = await db.execute<{ exists: boolean }>(
    //     sql`select exists(${db.select({ n: sql`1` }).from(members).where(eq(members.email, data.email))}) as exists`
    // )

    const existing = await db.query.members.findFirst({
      where: (member, { eq }) => eq(member.email, data.email),
      with: {
        memberLocations: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { existing: true, member: existing },
        { status: 200 }
      );
    }

    let user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, data.email),
      columns: {
        id: true,
      },
    });

    if (!user) {
      /** Create User if there isn't one */
      const [res] = await db
        .insert(users)
        .values({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
        })
        .returning();

      user = res;
    }

    const generateReferralCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const member = await db.transaction(async (tx) => {
      const [member] = await tx
        .insert(members)
        .values({
          ...data,
          dob: data.dob ? new Date(data.dob) : null,
          userId: user.id,
          phone: formatPhoneNumber(data.phone),
          referralCode: generateReferralCode(),
        })
        .returning({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          phone: members.phone,
        });

      await tx.insert(memberLocations).values({
        locationId: params.id,
        memberId: member.id,
        status: "incomplete",
      });
      return member;
    });

    return NextResponse.json({ existing: false, member }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
