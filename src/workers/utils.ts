// import { db } from "@/db/db";
// import { addDays, addYears, addMonths, addWeeks } from "date-fns";

// export async function fetchSubscriptionData(subscriptionId: string) {
//     const subscription = await db.query.memberSubscriptions.findFirst({
//         where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.id, subscriptionId),

//     });

//     if (!subscription) {
//         throw new Error(`Subscription not found for ID: ${subscriptionId}`);
//     }

//     return {
//         status: subscription.status,
//         cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
//         cancelAt: subscription.cancelAt,
//         currentPeriodEnd: subscription.currentPeriodEnd,
//         pricingId: subscription.memberPlanPricingId,
//     };
// }

// export async function fetchMemberData(memberId: string) {
//     const member = await db.query.members.findFirst({
//         where: (members, { eq }) => eq(members.id, memberId),
//     });

//     if (!member) {
//         throw new Error(`Member not found for ID: ${memberId}`);
//     }

//     return {
//         email: member.email,
//         firstName: member.firstName,
//         lastName: member.lastName,
//     };
// }

// export async function fetchLocationData(locationId: string) {
//     // TODO: Implement database query to fetch location
//     // Should return: name, address, email, phone
//     const location = await db.query.locations.findFirst({
//         where: (locations, { eq }) => eq(locations.id, locationId),
//     });

//     if (!location) {
//         throw new Error(`Location not found for ID: ${locationId}`);
//     }

//     return {
//         name: location.name,
//         address: location.address,
//         email: location.email,
//         phone: location.phone,
//     };
// }

// export async function fetchPricingData(pricingId: string) {
//     // TODO: Implement database query to fetch plan
//     // Should return: name, description, price, interval, intervalThreshold
//     const pricing = await db.query.memberPlanPricing.findFirst({
//         where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, pricingId),
//         with: {
//             plan: true,
//         }
//     });

//     if (!pricing) {
//         throw new Error(`Pricing not found for ID: ${pricingId}`);
//     }

//     const { plan, ...rest } = pricing;
//     return {
//         name: `${plan.name}::${rest.name}`,
//         description: plan.description,
//         price: pricing.price,
//         interval: pricing.interval,
//         intervalThreshold: pricing.intervalThreshold,
//     };
// }

// export async function fetchInvoiceData(invoiceId: string) {
//     const invoice = await db.query.memberInvoices.findFirst({
//         where: (memberInvoices, { eq }) => eq(memberInvoices.id, invoiceId),
//         with: {
//             member: true,
//             location: true,
//         }
//     });

//     if (!invoice) {
//         throw new Error(`Invoice not found for ID: ${invoiceId}`);
//     }

//     return invoice;
// }

// export function calculateNextPeriodEnd(
//     currentPeriodEnd: Date,
//     interval: string,
//     intervalThreshold: number
// ): Date {
//     switch (interval) {
//         case 'day':
//             return addDays(currentPeriodEnd, intervalThreshold);
//         case 'week':
//             return addWeeks(currentPeriodEnd, intervalThreshold);
//         case 'month':
//             return addMonths(currentPeriodEnd, intervalThreshold);
//         case 'year':
//             return addYears(currentPeriodEnd, intervalThreshold);
//         default:
//             throw new Error(`Invalid interval: ${interval}`);
//     }
// }

// export async function fetchReservationData(reservationId: string) {
//     const reservation = await db.query.reservations.findFirst({
//         where: (reservations, { eq }) => eq(reservations.id, reservationId),
//         with: {
//             session: {
//                 with: {
//                     program: true,
//                     staff: true,
//                 }
//             },
//             member: true,
//             location: true,
//         }
//     });

//     if (!reservation) {
//         throw new Error(`Reservation not found for ID: ${reservationId}`);
//     }

//     return reservation;
// }

// export async function fetchRecurringReservationData(recurringReservationId: string) {
//     const recurringReservation = await db.query.recurringReservations.findFirst({
//         where: (recurringReservations, { eq }) => eq(recurringReservations.id, recurringReservationId),
//         with: {
//             session: {
//                 with: {
//                     program: true,
//                     staff: true,
//                 }
//             },
//             member: true,
//             location: true,
//             exceptions: true,
//         }
//     });

//     if (!recurringReservation) {
//         throw new Error(`Recurring reservation not found for ID: ${recurringReservationId}`);
//     }

//     return recurringReservation;
// }

// export function calculateNextClassOccurrence(
//     startDate: Date,
//     interval: string,
//     intervalThreshold: number,
//     currentOccurrence: number = 0
// ): Date {
//     const nextDate = new Date(startDate);

//     switch (interval) {
//         case 'day':
//             return addDays(nextDate, intervalThreshold * currentOccurrence);
//         case 'week':
//             return addWeeks(nextDate, intervalThreshold * currentOccurrence);
//         case 'month':
//             return addMonths(nextDate, intervalThreshold * currentOccurrence);
//         case 'year':
//             return addYears(nextDate, intervalThreshold * currentOccurrence);
//         default:
//             throw new Error(`Invalid interval: ${interval}`);
//     }
// }