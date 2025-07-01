import {NextRequest, NextResponse} from "next/server";
import {db} from "@/db/db";

export async function GET(
  req: NextRequest,
  props: {params: Promise<{id: number}>}
) {
  const params = await props.params;
  try {
    const subs = await db.query.memberPlans.findMany({
      where: (memberPlans, {eq, and}) =>
        and(eq(memberPlans.locationId, params.id)),
      with: {
        planPrograms: {
          with: {
            program: true,
          },
        },
      },
    });

    return NextResponse.json(subs, {status: 200});
  } catch (err) {
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}
