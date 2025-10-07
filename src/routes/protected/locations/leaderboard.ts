import { db } from "@/db/db";
import { startOfDay, endOfDay, startOfMonth, startOfYear } from "date-fns";
import Elysia from "elysia";

export async function locationLeaderboard(app: Elysia) {
    return app.get('/leaderboard', async ({ params, status, query }) => {
        const { lid } = await params as { lid: string };
        const { range } = await query as { range: string };
        const now = new Date();

        let startDate = null;
        let endDate = null;
        if (range === "YTD") {
            startDate = startOfYear(now);
            endDate = now;
        } else if (range === "Current") {
            startDate = startOfMonth(now);
            endDate = endOfDay(now);
        }


        try {
            // const referrals = await db.query.memberReferrals.findMany({
            //     where: (referral, { eq, and, between }) => and(
            //         eq(referral.locationId, lid),
            //         // between(referral.created, startDate, endDate)
            //     ),
            // });

            // Get points history
            const pointsHistory = await db.query.memberPointsHistory.findMany({
                where: (mh, { eq, and, between }) => {
                    if (startDate && endDate) {
                        return and(
                            eq(mh.locationId, lid),
                            between(mh.created, startDate, endDate)
                        );
                    } else {
                        return eq(mh.locationId, lid);
                    }
                },
            });
            // Get unique member IDs from referrals
            // const referralMemberIds = [...new Set(referrals.map(r => r.memberId))];

            // Get unique member IDs from points
            const pointsMemberIds = [...new Set(pointsHistory.map(p => p.memberId))];

            // Get all member details
            const members = await db.query.members.findMany({
                where: (member, { inArray }) => inArray(member.id, [...pointsMemberIds])
            });

            // Calculate referral stats
            // const topReferrals = referralMemberIds.map(memberId => {
            //     const member = members.find(m => m.id == memberId);
            //     const referralCount = referrals.filter(r => r.memberId == memberId).length;

            //     return {
            //         ...member,
            //         referrals: referralCount
            //     };
            // }).sort((a, b) => b.referrals - a.referrals).slice(0, 10);

            // Calculate points stats
            const topMembers = pointsMemberIds.map(memberId => {
                const member = members.find(m => m.id == memberId);
                const totalPoints = pointsHistory
                    .filter(p => p.memberId === memberId)
                    .reduce((sum, p) => sum + p.points, 0);

                return {
                    ...member,
                    points: totalPoints
                };
            }).sort((a, b) => b.points - a.points).slice(0, 10);


            return status(200, topMembers);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch achievements");
        }
    })
}
