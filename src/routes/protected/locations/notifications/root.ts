import { emailQueue } from "@/workers/queues";
import type { Elysia } from "elysia";
import {
    HolidayCancellationProps,
    MakeupConfirmationProps,
    SessionCancellationProps,
} from "./schemas";

export async function locationNotifications(app: Elysia) {
    return app
        .post('/notifications/holiday/cancel', async ({ body, params }) => {
            const { lid } = params as { lid: string };
            const {
                holidayName,
                holidayDate,
                affectedMembers,
                locationName,
                locationAddress,
                locationEmail,
                locationPhone,
                makeupBaseUrl,
            } = body;

            const jobIds: string[] = [];
            const errors: Array<{ memberId: string; error: string }> = [];

            for (const member of affectedMembers) {
                try {
                    const cancelledReservations = member.reservations.map(res => {
                        const dateTime = new Date(res.originalTime);
                        return {
                            className: res.className,
                            originalDate: res.originalTime.split('T')[0],
                            originalTime: dateTime.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                            }),
                        };
                    });

                    const makeupUrl = makeupBaseUrl
                        ? `${makeupBaseUrl}?memberId=${member.memberId}`
                        : undefined;

                    const job = await emailQueue.add('send-email', {
                        to: member.email,
                        subject: `Class Cancellation: ${holidayName}`,
                        template: 'HolidayCancellationEmail',
                        metadata: {
                            member: {
                                firstName: member.firstName,
                                lastName: member.lastName,
                            },
                            location: {
                                name: locationName,
                                address: locationAddress,
                                email: locationEmail,
                                phone: locationPhone,
                            },
                            holiday: {
                                name: holidayName,
                                date: holidayDate,
                            },
                            cancelledReservations,
                            makeupUrl,
                        },
                    }, {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                        removeOnComplete: {
                            age: 60 * 60 * 24 * 7,
                            count: 100,
                        },
                    });

                    if (job.id) {
                        jobIds.push(job.id);
                    }
                } catch (error) {
                    console.error(`Failed to queue email for member ${member.memberId}:`, error);
                    errors.push({
                        memberId: member.memberId,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            console.log(`Holiday cancellation notifications queued for location ${lid}: ${jobIds.length} emails`);

            return {
                success: true,
                queued: jobIds.length,
                failed: errors.length,
                jobIds,
                errors: errors.length > 0 ? errors : undefined,
            };
        }, HolidayCancellationProps)
        .post('/notifications/makeup/confirm', async ({ body, params }) => {
            const { lid } = params as { lid: string };
            const {
                memberId,
                memberEmail,
                memberFirstName,
                originalClass,
                makeupClass,
                creditsRemaining,
                locationName,
                locationAddress,
            } = body;

            try {
                const instructor = makeupClass.instructorFirstName && makeupClass.instructorLastName
                    ? {
                        firstName: makeupClass.instructorFirstName,
                        lastName: makeupClass.instructorLastName,
                    }
                    : null;

                const job = await emailQueue.add('send-email', {
                    to: memberEmail,
                    subject: `Makeup Class Confirmed: ${makeupClass.name}`,
                    template: 'MakeupClassConfirmationEmail',
                    metadata: {
                        member: {
                            firstName: memberFirstName,
                        },
                        location: {
                            name: locationName,
                            address: locationAddress,
                        },
                        originalClass: {
                            name: originalClass.name,
                            date: originalClass.date,
                            time: originalClass.time,
                        },
                        makeupClass: {
                            name: makeupClass.name,
                            date: makeupClass.date,
                            time: makeupClass.time,
                            instructor,
                        },
                        creditsRemaining,
                    },
                }, {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: {
                        age: 60 * 60 * 24 * 7,
                        count: 100,
                    },
                });

                console.log(`Makeup confirmation notification queued for member ${memberId} at location ${lid}`);

                return {
                    success: true,
                    jobId: job.id,
                };
            } catch (error) {
                console.error(`Failed to queue makeup confirmation email for member ${memberId}:`, error);
                throw new Error(`Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }, MakeupConfirmationProps)
        .post('/notifications/session/cancel', async ({ body, params }) => {
            const { lid } = params as { lid: string };
            const {
                sessionName,
                sessionDate,
                sessionTime,
                instructorFirstName,
                instructorLastName,
                reason,
                affectedMembers,
                locationName,
                locationAddress,
                locationEmail,
                locationPhone,
                makeupBaseUrl,
            } = body;

            const jobIds: string[] = [];
            const errors: Array<{ memberId: string; error: string }> = [];

            const instructor = instructorFirstName && instructorLastName
                ? { firstName: instructorFirstName, lastName: instructorLastName }
                : null;

            for (const member of affectedMembers) {
                try {
                    const makeupUrl = makeupBaseUrl
                        ? `${makeupBaseUrl}?memberId=${member.memberId}`
                        : undefined;

                    const job = await emailQueue.add('send-email', {
                        to: member.email,
                        subject: `Class Cancelled: ${sessionName}`,
                        template: 'SessionCancellationEmail',
                        metadata: {
                            member: {
                                firstName: member.firstName,
                                lastName: member.lastName,
                            },
                            location: {
                                name: locationName,
                                address: locationAddress,
                                email: locationEmail,
                                phone: locationPhone,
                            },
                            session: {
                                className: sessionName,
                                date: sessionDate,
                                time: sessionTime,
                                instructor,
                            },
                            reason,
                            makeupUrl,
                        },
                    }, {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                        removeOnComplete: {
                            age: 60 * 60 * 24 * 7,
                            count: 100,
                        },
                    });

                    if (job.id) {
                        jobIds.push(job.id);
                    }
                } catch (error) {
                    console.error(`Failed to queue session cancellation email for member ${member.memberId}:`, error);
                    errors.push({
                        memberId: member.memberId,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            console.log(`Session cancellation notifications queued for location ${lid}: ${jobIds.length} emails`);

            return {
                success: true,
                queued: jobIds.length,
                failed: errors.length,
                jobIds,
                errors: errors.length > 0 ? errors : undefined,
            };
        }, SessionCancellationProps);
}
