
import {
    TablePage,
    TablePageFooter,
} from "@/components/ui";
import ErrorComponent from '@/components/error';
import { db } from "@/db/db";
import { AchievementTable } from "./components";
import { AchievementProvider } from "./providers";

async function fetchAchievements(lid: string) {

    try {
        const achievements = await db.query.achievements.findMany({
            where: (achievements, { eq }) => eq(achievements.locationId, lid),
            with: {
                trigger: true,
            }
        });

        return achievements;
    } catch (error) {
        console.error(error);
        return null;
    }
}


async function fetchTriggers() {
    try {
        const triggers = await db.query.achievementTriggers.findMany();

        return triggers;
    } catch (error) {
        console.error(error);
        return null;
    }
}


export default async function AchievementsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const lid = params.id;
    const achievements = await fetchAchievements(lid);
    const triggers = await fetchTriggers();

    if (!triggers) return <ErrorComponent error={new Error('Failed to fetch triggers')} />
    if (!achievements) return <ErrorComponent error={new Error('Failed to fetch achievements')} />

    return (
        <AchievementProvider achievements={achievements}>
            <TablePage>
                <AchievementTable lid={lid} triggers={triggers} />
                <TablePageFooter>
                    <div className='p-2'>
                        Showing {achievements && achievements.length} achievements
                    </div>
                </TablePageFooter>
            </TablePage>
        </AchievementProvider>
    )
}
