import { db } from "@/db/db";


async function fetchLocation(lid: string) {

    try {
        const location = await db.query.locations.findFirst({
            where: (loc, { eq }) => eq(loc.id, lid),

        })
        return location;
    } catch (error) {
        console.error(error);
        return null;

    }
}

export default async function AIBotsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const location = await fetchLocation(params.id);
    if (!location) {
        return <div className='flex flex-row  h-[calc(100vh-58px)]'>
            <div className='text-red-500'>Invalid location</div>
        </div>
    }
    return (
        <div className='flex flex-row  h-[calc(100vh-50px)]'>
            Coming soon
        </div>
    )
}
