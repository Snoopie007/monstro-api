
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState, supportBots } from '@/db/schemas';
import { BotModel, BotStatus } from '@/db/schemas/SupportBotEnums';
import { getDefaultSupportTools } from '@/libs/supportBotDefaults';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const DEFAULT_LOCATION_STATE = {
    planId: null,
    paymentPlanId: null,
    agreeToTerms: false,
    pkgId: null,
    usagePercent: 0,
}

export async function POST(req: Request) {
    const data = await req.json();

    try {

        const location = await db.transaction(async (tx) => {
            const [location] = await tx.insert(locations).values({
                ...data,
                phone: parsePhoneNumberFromString(data.phone)?.number,
                slug: data.name.toLowerCase().replace(/ /g, '')
            }).returning({ id: locations.id, name: locations.name });

            await tx.insert(locationState).values({
                locationId: location.id,
                ...DEFAULT_LOCATION_STATE
            })

            // Create support bot for new location
            await tx.insert(supportBots).values({
                locationId: location.id,
                name: "Support Bot",
                prompt: "You are a helpful customer support assistant. You have access to member information tools to help with subscriptions, billing, and bookable sessions. You can also create support tickets and escalate to human agents when needed.",
                initialMessage: "Hi! I'm here to help you. I can assist with your membership status, billing questions, available classes, and any other support needs. What can I help you with today?",
                temperature: 0,
                model: BotModel.GPT,
                status: BotStatus.Draft,
                availableTools: getDefaultSupportTools(),
            });

            return { ...location, status: "incomplete" }
        });

        return NextResponse.json({ ...location }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

