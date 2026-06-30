import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../db';
import { chats } from '../../../../db/schema';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { firstMessage } = await req.json();

    // Create a clean display title using a snippet of their initial query
    const displayTitle = firstMessage.length > 30 
      ? `${firstMessage.substring(0, 30)}...` 
      : firstMessage;

    // Insert the new thread and return the structural database ID
    const [newChat] = await db.insert(chats).values({
      userId: userId,
      title: displayTitle,
    }).returning({ chatId: chats.id });

    return NextResponse.json({ chatId: newChat.chatId });
  } catch (error) {
    console.error("🔥 Route initialization error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}