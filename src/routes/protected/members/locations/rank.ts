import { asc } from "drizzle-orm";
import { ranks } from "@/subtrees/schemas";
import { db } from "@/db/db"
import { Elysia, t } from "elysia"

const MLRankProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

export function mlRankRoutes(app: Elysia) {
    return app.get('/ranks', async ({ params, status }) => {
        const { mid, lid } = params;
        try {

            const [memberRanks, memberRankRequirements] = await Promise.all([
                db.query.memberRanks.findFirst({
                    where: (memberRank, { eq, and }) => and(
                        eq(memberRank.memberId, mid),
                        eq(memberRank.locationId, lid),
                    ),
                    with: {
                        process: {
                            with: {
                                ranks: {
                                    orderBy: [asc(ranks.sortOrder)],
                                    with: {
                                        requirements: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                db.query.memberRankRequirements.findMany({
                    where: (mrr, { eq, and }) => and(
                        eq(mrr.memberId, params.mid),
                        eq(mrr.locationId, params.lid),
                    ),
                }),
            ]);

            if (!memberRanks) {
                return status(404, { error: "Member rank not found" });
            }

            const { process, ...memberRank } = memberRanks;

            return status(200, { process: { ...process, ranks: process.ranks.filter(rank => !rank.archivedAt || rank.id === memberRank.rankId) }, memberRank, memberRankRequirements });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch achievements" });
        }
    }, MLRankProps)
}

