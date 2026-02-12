import { db } from "@/db/db"
import { migrateMembers } from "@subtrees/schemas/MigrateMembers"
import { memberPlanPricing } from "@subtrees/schemas/MemberPlans"
import { desc, eq, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
 
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const searchParams = request.nextUrl.searchParams
    
    const page = parseInt(searchParams.get("page") || "1", 10)
    const size = parseInt(searchParams.get("size") || "15", 10)
    
    const offset = (page - 1) * size
    
    try {
        // Fetch migrations for the location
        const migrations = await db
            .select()
            .from(migrateMembers)
            .leftJoin(memberPlanPricing, eq(migrateMembers.pricingId, memberPlanPricing.id))
            .where(eq(migrateMembers.locationId, params.id))
            .orderBy(desc(migrateMembers.created))
            .limit(size)
            .offset(offset)

        // Get total count
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(migrateMembers)
            .where(eq(migrateMembers.locationId, params.id))

        // Transform result to flatten the joined data
        const formattedMigrations = migrations.map(row => ({
            ...row.migrate_members,
            pricing: row.member_plan_pricing,
        }))
        
        return NextResponse.json({
            migrations: formattedMigrations,
            count: parseInt(count.toString(), 10),
        })
    } catch (error) {
        console.error("Error fetching migrations:", error)
        return NextResponse.json(
            { error: "Failed to fetch migrations" },
            { status: 500 }
        )
    }
}
