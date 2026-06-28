import { streamText, toUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { groq } from '@ai-sdk/groq';
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const messages: any[] = body.messages ?? [];

  // ── Extract user query (SDK v7 sends messages with `parts`, not `content`) ──
  const lastMessage = messages[messages.length - 1];
  let userQuery = '';

  if (typeof lastMessage?.content === 'string') {
    userQuery = lastMessage.content;
  } else if (Array.isArray(lastMessage?.parts)) {
    userQuery = lastMessage.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join(' ');
  } else if (typeof lastMessage?.text === 'string') {
    userQuery = lastMessage.text;
  }

  console.log(`🌍 Searching the web for: "${userQuery}"`);

  // ── Firecrawl web search ──
  let webContext = 'No specific web results found. Answer from training knowledge.';
  try {
    if (userQuery.trim()) {
      const results: any = await firecrawl.search(userQuery, {
        limit: 3,
        scrapeOptions: { formats: ['markdown'] },
      });
      const pages = results?.web ?? results?.data ?? [];
      if (pages.length > 0) {
        console.log(`✅ Firecrawl returned ${pages.length} result(s).`);
        webContext = pages
          .map((page: any, i: number) => {
            const body = page.markdown ?? page.content ?? page.text ?? '';
            return `[Source ${i + 1}] ${page.title ?? 'Unknown'} (${page.url})\n${body.substring(0, 3000)}`;
          })
          .join('\n\n---\n\n');
      } else {
        console.log('⚠️ Firecrawl returned no results. Shape:', JSON.stringify(Object.keys(results ?? {})));
      }
    }
  } catch (err) {
    console.error('🔥 Firecrawl Error:', err);
  }

  // ── Normalise messages for the model (parts → content string) ──
  const modelMessages = messages.map((m: any) => {
    let content: string = '';
    if (typeof m.content === 'string') {
      content = m.content;
    } else if (Array.isArray(m.parts)) {
      content = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text as string)
        .join('\n');
    } else if (typeof m.text === 'string') {
      content = m.text;
    }
    return { role: m.role as 'user' | 'assistant', content };
  });

  const systemPrompt = `You are an elite Answer Engine powered by live web data, similar to Perplexity AI.

CRITICAL RULES:
1. NEVER claim you lack real-time data. You have live internet context provided below.
2. Always write DETAILED, COMPREHENSIVE answers (minimum 150 words).
3. Use rich Markdown: ## headers, **bold**, bullet lists, numbered lists, inline code.
4. Cite sources inline as markdown links: [Source Title](url).
5. ALWAYS end your response with a "### Follow-ups" section containing EXACTLY 3 bulleted questions that the user might want to ask next based on your answer. Format them as a simple bulleted list.

--- LIVE WEB RESULTS ---
${webContext}
--- END WEB RESULTS ---`;

  // ── Stream text via Groq then convert to UI message stream ──
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages: modelMessages,
  });

  // toUIMessageStream is the SDK v7 bridge between streamText and useChat
  const uiStream = toUIMessageStream({ stream: result.fullStream });

  return createUIMessageStreamResponse({ stream: uiStream });
}