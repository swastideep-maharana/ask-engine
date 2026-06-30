import { db } from '../../../db';
import { messages as messagesTable } from '../../../db/schema';
import { eq, asc } from 'drizzle-orm';
import Chat from '../../../components/Chat';

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params;

  // 1. Fetch all past messages for this specific thread, sorted chronologically
  let pastMessages: any[] = [];
  try {
    pastMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.chatId, chatId))
      .orderBy(asc(messagesTable.createdAt));
  } catch (error) {
    console.error("🔥 Failed to fetch past messages for thread:", error);
  }

  // 2. Format the database rows into the exact shape the Vercel AI SDK expects
  const initialMessages = pastMessages
    .filter(m => m.content && m.content.trim() !== '')
    .map((m) => ({
      id: m.id.toString(),
      role: m.role as 'user' | 'assistant' | 'system' | 'data',
      content: m.content
    }));

  // 3. Render your existing Chat UI, but inject the memory into it
  return (
    <Chat key={chatId} initialChatId={chatId} initialMessages={initialMessages as any} />
  );
}
