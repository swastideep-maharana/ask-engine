import { streamText, tool, convertToModelMessages, isStepCount, smoothStream } from 'ai';
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
  console.log("🔥 Incoming messages payload:", JSON.stringify(messages, null, 2));

  // 2. DATABASE: Save the user's message
  const lastUserMessage = messages[messages.length - 1];

  // 3. SANITIZE & NORMALIZE: Groq is very strict about alternating roles.
  // We normalize everything to ensure BOTH 'content' (string) and 'parts' (array) are present.
  const normalizeMessage = (msg: any) => {
    let parts = msg.parts || [];
    let content = typeof msg.content === 'string' ? msg.content : '';

    if (parts.length > 0 && !content) {
      content = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
    } else if (content && parts.length === 0) {
      parts = [{ type: 'text', text: content }];
    }

    return { ...msg, content, parts };
  };

  const sanitizedMessages = messages
    .map(normalizeMessage)
    .reduce((acc: any[], current: any) => {
      if (acc.length === 0) return [current];
      const last = acc[acc.length - 1];
      // Merge consecutive messages of the same role (safety guard)
      if (last.role === current.role) {
        last.content += '\n\n' + current.content;
        last.parts.push(...current.parts);
        return acc;
      }
      return [...acc, current];
    }, []);

  // In ai v7, message content lives in the `parts` array, not a `.content` string.
  // Extract text by joining all text parts, with a fallback to the legacy .content field.
  const extractText = (msg: any): string => {
    if (msg?.parts?.length) {
      return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text as string)
        .join('');
    }
    return typeof msg?.content === 'string' ? msg.content : '';
  };

  // If we have a chatId, we save the user's message immediately (with error handling)
  if (chatId) {
    try {
      await db.insert(messagesTable).values({
        chatId: chatId,
        role: 'user',
        content: extractText(lastUserMessage),
      });
    } catch (error) {
      console.error("🔥 Failed to save user message to DB (connection limit?):", error);
    }
  }

  try {
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      experimental_transform: smoothStream(),
      system: `You are an elite Answer Engine. You HAVE direct access to the live internet via the webSearch tool. 
      
      CRITICAL RULES:
      1. NEVER say "I don't have access to real-time data" or mention a "knowledge cutoff". 
      2. NEVER apologize for not knowing current events.
      3. If a user asks about current events, news, sports scores, or recent facts, you MUST IMMEDIATELY trigger the webSearch tool.
      4. Read the scraped markdown data carefully, then write a comprehensive, highly accurate response using Markdown formatting.
      5. When calling the webSearch tool, provide ONLY the "query" parameter as a simple string. Do NOT add any extra parameters.`,
      
      messages: await convertToModelMessages(sanitizedMessages), 
      stopWhen: isStepCount(5),
      tools: {
        webSearch: tool({
          description: 'Search the live internet and scrape the top results for accurate information. Only requires a query string.',
          inputSchema: z.object({
            query: z.string().describe('The search query'),
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
      onFinish: async ({ text }) => {
        if (chatId && text) {
          try {
            await db.insert(messagesTable).values({
              chatId: chatId,
              role: 'assistant',
              content: text,
            });
          } catch (error) {
            console.error("🔥 Failed to save assistant message to DB:", error);
          }
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("🔥 streamText failed, falling back to non-tool response:", error?.message);
    
    // Fallback: re-run without tools so the user still gets an answer
    const fallbackResult = streamText({
      model: groq('llama-3.3-70b-versatile'),
      experimental_transform: smoothStream(),
      system: `You are an elite Answer Engine. Answer the user's question to the best of your knowledge using Markdown formatting.`,
      messages: await convertToModelMessages(sanitizedMessages),
      onFinish: async ({ text }) => {
        if (chatId && text) {
          try {
            await db.insert(messagesTable).values({
              chatId: chatId,
              role: 'assistant',
              content: text,
            });
          } catch (error) {
             console.error("🔥 Fallback: Failed to save assistant message to DB:", error);
          }
        }
      }
    });

    return fallbackResult.toUIMessageStreamResponse();
  }
}