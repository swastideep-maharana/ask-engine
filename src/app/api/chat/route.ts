import { streamText, tool, convertToModelMessages, isStepCount } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import FirecrawlApp from '@mendable/firecrawl-js';
// NEW IMPORTS: Clerk for Auth, Drizzle for Database
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../db';
import { messages as messagesTable, chats } from '../../../db/schema';
import { eq } from 'drizzle-orm';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export const maxDuration = 60; 

export async function POST(req: Request) {
  // 1. SECURITY: Block anyone who isn't logged in via Clerk
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // We are now expecting the frontend to send a 'chatId' along with the messages
  const { messages, chatId } = await req.json();

  // 2. DATABASE: Save the user's message
  const lastUserMessage = messages[messages.length - 1];
  
  // If we have a chatId, we save the user's message immediately
  if (chatId) {
    await db.insert(messagesTable).values({
      chatId: chatId,
      role: 'user',
      content: lastUserMessage.content,
    });
  }

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are an elite Answer Engine. You HAVE direct access to the live internet via the webSearch tool. 
    
    CRITICAL RULES:
    1. NEVER say "I don't have access to real-time data" or mention a "knowledge cutoff". 
    2. NEVER apologize for not knowing current events.
    3. If a user asks about current events, news, sports scores, or recent facts, you MUST IMMEDIATELY trigger the webSearch tool.
    4. Read the scraped markdown data carefully, then write a comprehensive, highly accurate response using Markdown formatting.`,
    
    messages: await convertToModelMessages(messages), 
    stopWhen: isStepCount(5),
    tools: {
      webSearch: tool({
        description: 'Search the live internet and scrape the top results for accurate information.',
        inputSchema: z.object({
          query: z.string().describe('The optimized search query to look up'),
        }),
        execute: async ({ query }) => {
          console.log(`🌍 Scraping the web for: ${query}`);
          try {
            const searchResults = await app.search(query, {
              limit: 2,
              scrapeOptions: { formats: ['markdown'] }
            });
            const results = searchResults.web ?? [];
            if (results.length === 0) return { error: "Failed to search." };
            return { results: results.map((page: any) => ({
              url: page.url, title: page.title, content: page.markdown?.substring(0, 3000) 
            }))};
          } catch (error) {
            return { error: 'The search engine failed to return results.' };
          }
        },
      }),
    },
    // 3. DATABASE: The onFinish Hook
    // This automatically fires the millisecond the AI finishes streaming its answer to the UI
    onFinish: async ({ text }) => {
      if (chatId && text) {
        await db.insert(messagesTable).values({
          chatId: chatId,
          role: 'assistant',
          content: text,
        });
      }
    }
  });

  return result.toUIMessageStreamResponse();
}