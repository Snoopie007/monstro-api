// import { addDays } from "date-fns";
// import { fetchReservationData, fetchRecurringReservationData, calculateNextClassOccurrence } from "../utils";
// import { emailQueue, classQueue } from "../queues";
// import { db } from "@/db/db";

// export async function processClassReminder(data: {
//     reservationId: string;
//     locationId: string;
// }) {
//     const { reservationId, locationId } = data;
//     console.log(`📅 Processing class reminder for reservation ${reservationId}`);

//     try {
//         // Fetch fresh reservation data
//         const reservation = await fetchReservationData(reservationId);

//         // Check if reservation still exists and is valid
//         if (!reservation) {
//             console.log(`⏭️ Reservation ${reservationId} not found. Skipping reminder.`);
//             return;
//         }

//         // Check if class is 3 days away
//         const now = new Date();
//         const classDate = new Date(reservation.startOn);
//         const reminderDate = addDays(classDate, -3);

//         // Only send if within reminder window (3 days before)
//         if (now >= reminderDate && now < classDate) {
//             console.log(`📧 Sending class reminder for reservation ${reservationId}`);

//             // Queue email
//             await emailQueue.add('send-email', {
//                 to: reservation.member.email,
//                 subject: `Class Reminder: ${reservation.session?.program.name}`,
//                 template: 'ClassReminderEmail',
//                 metadata: {
//                     member: {
//                         firstName: reservation.member.firstName,
//                         lastName: reservation.member.lastName,
//                         email: reservation.member.email,
//                     },
//                     class: {
//                         name: reservation.session?.program.name,
//                         description: reservation.session?.program.description,
//                         startTime: reservation.startOn,
//                         endTime: reservation.endOn,
//                         instructor: reservation.session?.staff ? {
//                             firstName: reservation.session?.staff.firstName,
//                             lastName: reservation.session?.staff.lastName,
//                         } : null,
//                     },
//                     location: {
//                         name: reservation.location.name,
//                         address: reservation.location.address,
//                         email: reservation.location.email,
//                         phone: reservation.location.phone,
//                     },
//                 },
//             });

//             console.log(`✅ Class reminder sent for reservation ${reservationId}`);
//         } else {
//             console.log(`⏭️ Reservation ${reservationId} is not within reminder window. Skipping.`);
//         }
//     } catch (error) {
//         console.error(`❌ Error processing class reminder for reservation ${reservationId}:`, error);
//         throw error;
//     }
// }

// export async function processRecurringClassReminder(data: {
//     recurringReservationId: string;
//     locationId: string;
//     reminderCount?: number;
// }) {
//     const { recurringReservationId, locationId, reminderCount = 0 } = data;
//     console.log(`📅 Processing recurring class reminder [${reminderCount}] for recurring reservation ${recurringReservationId}`);

//     try {
//         // Fetch fresh recurring reservation data
//         const recurringReservation = await fetchRecurringReservationData(recurringReservationId);

//         // Check if still active (not cancelled)
//         if (recurringReservation.canceledOn) {
//             console.log(`⏭️ Recurring reservation ${recurringReservationId} is cancelled. Stopping reminders.`);
//             return; // Exit without rescheduling
//         }

//         const now = new Date();
//         const startDate = new Date(recurringReservation.startDate);

//         // Calculate next occurrence
//         const nextOccurrence = calculateNextClassOccurrence(
//             startDate,
//             recurringReservation.interval,
//             recurringReservation.intervalThreshold,
//             reminderCount
//         );

//         // Check if this occurrence is in an exception
//         const isException = recurringReservation.exceptions?.some(
//             exception => {
//                 const excDate = new Date(exception.occurrenceDate);
//                 return excDate.toDateString() === nextOccurrence.toDateString();
//             }
//         );

//         if (isException) {
//             console.log(`⏭️ Occurrence on ${nextOccurrence.toISOString()} is an exception. Skipping to next.`);

//             // Schedule for next occurrence
//             const nextCheckDate = addDays(nextOccurrence, -3);
//             const delay = Math.max(0, nextCheckDate.getTime() - Date.now());

//             await classQueue.add('process-recurring-class-reminder', {
//                 recurringReservationId,
//                 locationId,
//                 reminderCount: reminderCount + 1,
//             }, {
//                 jobId: `recurring-class-reminder-${recurringReservationId}-reminder-${reminderCount + 1}`,
//                 delay,
//                 attempts: 3,
//                 backoff: { type: 'exponential', delay: 5000 }
//             });
//             return;
//         }

//         // Check if 3 days before class
//         const reminderDate = addDays(nextOccurrence, -3);

//         if (now >= reminderDate && now < nextOccurrence) {
//             console.log(`📧 Sending recurring class reminder for ${nextOccurrence.toISOString()}`);

//             // Get session time details to calculate actual start/end times
//             const session = recurringReservation.session;
//             if (!session?.time) {
//                 console.error(`❌ Invalid session data: missing time for session ${session?.id}`);
//                 throw new Error(`Session ${session?.id} has no time defined`);
//             }
//             const [hours, minutes] = session?.time.split(':').map(Number);
//             const startTime = new Date(nextOccurrence);
//             startTime.setHours(hours!, minutes, 0, 0);
//             const endTime = new Date(startTime.getTime() + session?.duration * 60000);

//             // Queue email
//             await emailQueue.add('send-email', {
//                 to: recurringReservation.member.email,
//                 subject: `Class Reminder: ${session.program.name}`,
//                 template: 'ClassReminderEmail',
//                 metadata: {
//                     member: {
//                         firstName: recurringReservation.member.firstName,
//                         lastName: recurringReservation.member.lastName,
//                         email: recurringReservation.member.email,
//                     },
//                     class: {
//                         name: session.program.name,
//                         description: session.program.description,
//                         startTime: startTime.toISOString(),
//                         endTime: endTime.toISOString(),
//                         instructor: session.staff ? {
//                             firstName: session.staff.firstName,
//                             lastName: session.staff.lastName,
//                         } : null,
//                     },
//                     location: {
//                         name: recurringReservation.location.name,
//                         address: recurringReservation.location.address,
//                         email: recurringReservation.location.email,
//                         phone: recurringReservation.location.phone,
//                     },
//                 },
//             });

//             console.log(`✅ Recurring class reminder sent for ${nextOccurrence.toISOString()}`);
//         }

//         // Schedule next reminder (for next occurrence)
//         const nextOccurrenceDate = calculateNextClassOccurrence(
//             startDate,
//             recurringReservation.interval,
//             recurringReservation.intervalThreshold,
//             reminderCount + 1
//         );
//         const nextCheckDate = addDays(nextOccurrenceDate, -3);
//         const delay = Math.max(0, nextCheckDate.getTime() - Date.now());

//         console.log(`🔄 Scheduling next recurring reminder for ${nextOccurrenceDate.toISOString()} (check on ${nextCheckDate.toISOString()})`);

//         await classQueue.add('process-recurring-class-reminder', {
//             recurringReservationId,
//             locationId,
//             reminderCount: reminderCount + 1,
//         }, {
//             jobId: `recurring-class-reminder-${recurringReservationId}-reminder-${reminderCount + 1}`,
//             delay,
//             attempts: 3,
//             backoff: { type: 'exponential', delay: 5000 }
//         });

//     } catch (error) {
//         console.error(`❌ Error processing recurring class reminder for ${recurringReservationId}:`, error);
//         throw error;
//     }
// }

// export async function checkMissedClass(data: {
//     reservationId: string;
//     locationId: string;
// }) {
//     const { reservationId, locationId } = data;
//     console.log(`⏰ Checking for missed class for reservation ${reservationId}`);

//     try {
//         // Fetch fresh reservation data
//         const reservation = await fetchReservationData(reservationId);

//         if (!reservation) {
//             console.log(`❌ Reservation ${reservationId} not found`);
//             return;
//         }

//         const now = new Date();
//         const classEndTime = new Date(reservation.endOn);

//         // Only check after class has ended + 30 minutes
//         if (now < new Date(classEndTime.getTime() + 30 * 60000)) {
//             console.log(`⏭️ Class for reservation ${reservationId} has not ended yet. Skipping check.`);
//             return;
//         }

//         // Query attendance record for this reservation
//         const attendance = await db.query.attendances.findFirst({
//             where: (attendances, { eq }) => eq(attendances.reservationId, reservationId),
//         });

//         // If no attendance found → send missed class email
//         if (!attendance) {
//             console.log(`📧 Sending missed class email for reservation ${reservationId}`);

//             await emailQueue.add('send-email', {
//                 to: reservation.member.email,
//                 subject: `We Missed You: ${reservation.session?.program.name}`,
//                 template: 'MissedClassEmail',
//                 metadata: {
//                     member: {
//                         firstName: reservation.member.firstName,
//                         lastName: reservation.member.lastName,
//                         email: reservation.member.email,
//                     },
//                     class: {
//                         name: reservation.session?.program.name,
//                         description: reservation.session?.program.description,
//                         startTime: reservation.startOn,
//                         endTime: reservation.endOn,
//                         instructor: reservation.session?.staff ? {
//                             firstName: reservation.session?.staff.firstName,
//                             lastName: reservation.session?.staff.lastName,
//                         } : null,
//                     },
//                     location: {
//                         name: reservation.location.name,
//                         address: reservation.location.address,
//                         email: reservation.location.email,
//                         phone: reservation.location.phone,
//                     },
//                 },
//             });

//             console.log(`✅ Missed class email sent for reservation ${reservationId}`);
//         } else {
//             console.log(`✅ Member checked in for reservation ${reservationId}. No missed class email needed.`);
//         }
//     } catch (error) {
//         console.error(`❌ Error checking missed class for reservation ${reservationId}:`, error);
//         throw error;
//     }
// }

