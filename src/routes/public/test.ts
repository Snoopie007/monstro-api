import { Elysia, t } from "elysia";
import { testQueue } from "@/workers/queues";
import { } from "date-fns-tz";
export function testRoutes(app: Elysia) {
    return app.post('/test', async ({ body, status }) => {
        const { subId } = body;

        const today = new Date();
        // await testQueue.upsertJobScheduler(`test3`,
        //     { pattern: "35 14 11 * *", utc: true },
        //     {
        //         name: `test3`,
        //         data: {
        //             message: 'Hello, world! 3',
        //         },
        //         opts: {
        //             attempts: 3,
        //             removeOnComplete: true,
        //         }
        //     }
        // );

        // await testQueue.upsertJobScheduler(`test4`,
        //     { pattern: "35 14 11 * *", utc: true, startDate: new Date("2026-03-11") },
        //     {
        //         name: `test3`,
        //         data: {
        //             message: 'Hello, world! 3',
        //         },
        //         opts: {
        //             attempts: 3,
        //             removeOnComplete: true,
        //         }
        //     }
        // );

        // const result = await subQueue.removeJobScheduler(`renewal:${subId}`);
        const result = await testQueue.removeJobScheduler(`test3`);
        const result2 = await testQueue.removeJobScheduler(`test4`);
        console.log(result);
        console.log(result2);
        // console.log(result);
        return status(200, {
            message: 'Hello, world!',
        });
    }, {
        body: t.Object({
            subId: t.String(),
        }),
    });
}