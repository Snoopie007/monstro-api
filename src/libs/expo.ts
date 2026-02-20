import { Expo } from "expo-server-sdk";
import type { ExpoPushMessage } from "expo-server-sdk";
if (!process.env.EXPO_ACCESS_TOKEN) {
    throw new Error("EXPO_ACCESS_TOKEN is not set");
}
const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
});




async function sendNotifications(
    messages: ExpoPushMessage[]
) {
    const chunks = expo.chunkPushNotifications(messages);
    let results = [];
    // Send the chunks to the Expo push notification service. There are
    // different strategies you could use. A simple one is to send one chunk at a
    // time, which nicely spreads the load out over time:
    for (const chunk of chunks) {
        try {
            const chunkResult = await expo.sendPushNotificationsAsync(chunk);
            console.log('result of sending push messages to Expo:', chunkResult);
            results.push(...chunkResult);
        } catch (error) {
            console.error(error);
        }
    }
}