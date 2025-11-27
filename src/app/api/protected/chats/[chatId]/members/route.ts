import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { chatMembers, groupMembers } from '@/db/schemas';
import { authWithContext } from '@/libs/auth/server';

export async function POST(
    req: Request,
    props: { params: Promise<{ chatId: string }> }
) {
    const params = await props.params;
    const { chatId } = params;
    const { memberId } = await req.json();

    if (!memberId) {
        return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    try {
        const session = await authWithContext();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await db.transaction(async (tx) => {
            // 1. Get member to find userId
            const member = await tx.query.members.findFirst({
                where: (members, { eq }) => eq(members.id, memberId),
            });

            if (!member || !member.userId) {
                throw new Error('Member or User ID not found');
            }

            // 2. Add to chat_members (ignore if exists)
            await tx.insert(chatMembers)
                .values({
                    chatId: chatId,
                    userId: member.userId,
                })
                .onConflictDoNothing();

            // 3. Check if chat has a group
            const chat = await tx.query.chats.findFirst({
                where: (chats, { eq }) => eq(chats.id, chatId),
            });

            if (chat?.groupId) {
                // 4. Add to group_members if chat has group
                await tx.insert(groupMembers)
                    .values({
                        groupId: chat.groupId,
                        userId: member.userId,
                    })
                    .onConflictDoNothing();
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to add member to chat' }, { status: 500 });
    }
}

