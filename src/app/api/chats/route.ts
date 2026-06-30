import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../db';
import { chats } from '../../../db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Verify who is asking
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Query the database for only THEIR chats, newest first
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: [desc(chats.createdAt)],
    });

    return NextResponse.json(userChats);
  } catch (error) {
    console.error("🔥 Error fetching chat history:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
