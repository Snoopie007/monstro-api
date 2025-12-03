import { db } from "@/db/db";
import { endOfDay, startOfMonth, startOfYear } from "date-fns";
import Elysia from "elysia";
import { z } from "zod";

const LocationLeaderboardProps = {
    params: z.object({
        lid: z.string(),
    }),
    query: z.object({
        range: z.enum(["YTD", "Current"]),
    }),
};

const DUMMY_DATA = [
    { id: "1", firstName: "Michael", lastName: "Brown", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=michael", points: 2847 },
    { id: "2", firstName: "Sarah", lastName: "Davis", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=sarah", points: 2156 },
    { id: "3", firstName: "David", lastName: "Miller", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=david", points: 1923 },
    { id: "4", firstName: "Jessica", lastName: "Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=jessica", points: 1678 },
    { id: "5", firstName: "Michael", lastName: "Brown", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=michael", points: 1445 },
    { id: "6", firstName: "Sarah", lastName: "Davis", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=sarah", points: 1289 },
    { id: "7", firstName: "David", lastName: "Miller", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=david", points: 1067 },
    { id: "8", firstName: "Jessica", lastName: "Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=jessica", points: 834 },
    { id: "9", firstName: "Michael", lastName: "Brown", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=michael", points: 612 },
    { id: "10", firstName: "Sarah", lastName: "Davis", avatar: "https://api.dicebear.com/7.x/avataaars/png?seed=sarah", points: 398 }
];

export async function locationLeaderboard(app: Elysia) {
    return app.get('/leaderboard', async ({ params, status, query }) => {
        const { lid } = params;
        const { range } = query;

        if (lid === 'acc_BpT7jEb3Q16nOPL3vo7qlw') {
            return status(200, DUMMY_DATA);
        }

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
    }, LocationLeaderboardProps)
}
