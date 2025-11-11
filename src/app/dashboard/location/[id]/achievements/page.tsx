
import ErrorComponent from '@/components/error';
import { db } from "@/db/db";
import { AchievementList, CreateAchievement } from "./components";
import { AchievementProvider } from "./providers";
async function fetchAchievements(lid: string) {

    try {
        const achievements = await db.query.achievements.findMany({
            where: (achievements, { eq }) => eq(achievements.locationId, lid),
        });

        return achievements;
    } catch (error) {
        console.error(error);
        return null;
    }
}




export default async function AchievementsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const lid = params.id;
    const achievements = await fetchAchievements(lid);

    if (!achievements) return <ErrorComponent error={new Error('Failed to fetch achievements')} />

    return (
        <AchievementProvider achievements={achievements}>
            <div className='max-w-6xl mx-auto py-4 space-y-4'>

                <CreateAchievement lid={lid} />
                <div className='border border-foreground/10 rounded-lg'>
                    <AchievementList lid={lid} />
                </div>
            </div>
        </AchievementProvider>
    )
}
