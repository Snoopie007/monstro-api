import { Elysia, t } from "elysia";
import { subQueue } from "@/workers/queues";

export function testRoutes(app: Elysia) {
    return app.post('/test', async ({ body, status }) => {
        const { subId } = body;
        // const queue = await subQueue.upsertJobScheduler(`renewal:${subId}`,
        //     { pattern: '* * * * *' },
        //     {
        //         name: `renewal:${subId}`,
        //         data: {
        //             subId,
        //         },
        //         opts: {
        //             attempts: 3,
        //             removeOnComplete: true,
        //         }
        //     }
        // );
        const result = await subQueue.removeJobScheduler(`renewal:${subId}`);
        console.log(result);
        return status(200, {
            message: 'Hello, world!',
        });
    }, {
        body: t.Object({
            subId: t.String(),
        }),
    });
}