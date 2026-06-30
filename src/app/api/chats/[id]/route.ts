import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../db';
import { chats, messages as messagesTable } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: chatId } = await params;

    // Verify ownership of the chat
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    });

    if (!chat) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Delete associated messages first (if foreign keys don't cascade)
    await db.delete(messagesTable).where(eq(messagesTable.chatId, chatId));

    // Delete the chat itself
    await db.delete(chats).where(eq(chats.id, chatId));

    return new NextResponse('Deleted successfully', { status: 200 });
  } catch (error) {
    console.error("🔥 Error deleting chat:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: chatId } = await params;
    const { title } = await req.json();

    if (!title || typeof title !== 'string') {
      return new NextResponse('Bad Request: Invalid title', { status: 400 });
    }

    // Verify ownership
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    });

    if (!chat) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Update the title
    await db.update(chats)
      .set({ title: title.trim() })
      .where(eq(chats.id, chatId));

    return new NextResponse('Renamed successfully', { status: 200 });
  } catch (error) {
    console.error("🔥 Error renaming chat:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
