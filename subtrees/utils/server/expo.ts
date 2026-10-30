import { Expo } from "expo-server-sdk";
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

if (!process.env.EXPO_ACCESS_TOKEN) {
    throw new Error("EXPO_ACCESS_TOKEN is not set");
}
const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
});

async function sendNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("result of sending push messages to Expo:", ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }
    return tickets;
}

/**
 * Fetch delivery receipts for sent notifications. Call after sendNotifications (e.g. after a delay).
 * Not all tickets have IDs; tickets for notifications that could not be enqueued have error info and no receipt ID.
 */
async function getPushNotificationReceipts(tickets: ExpoPushTicket[]): Promise<void> {
    const receiptIds = tickets
        .filter((ticket): ticket is ExpoPushTicket & { status: "ok"; id: string } => ticket.status === "ok")
        .map((ticket) => ticket.id);
    if (receiptIds.length === 0) return;

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptIdChunks) {
        try {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

            const failedReceipts = Object.values(receipts).filter((receipt) => receipt.status !== "ok");
            failedReceipts.forEach(({ message, details }) => {
                console.error(`There was an error sending a notification: ${message}`);
                if (details?.error) {
                    console.error(`The error code is ${details.error}`);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }
}

export { sendNotifications, getPushNotificationReceipts };
