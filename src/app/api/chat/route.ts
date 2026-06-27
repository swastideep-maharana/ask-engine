// Force Turbopack Cache Invalidation v5
import { streamText, isStepCount, tool } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
  fetch: async (url, options: any) => {
    // Intercept to fix Vercel AI SDK v7 dropping JSON schema properties for Groq
    if (options && options.body && typeof options.body === 'string') {
      const body = JSON.parse(options.body);
      if (body.tools) {
        for (const tool of body.tools) {
          const toolName = tool.function?.name || tool.name;
          if (toolName === 'getWeather') {
            const targetParams = tool.function ? tool.function : tool;
            targetParams.parameters = {
              type: 'object',
              properties: { city: { type: 'string', description: 'The exact city name, e.g. Tokyo, London' } },
              required: ['city'],
            };
          }
        }
        options.body = JSON.stringify(body);
      }
    }
    return globalThis.fetch(url, options);
  }
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Normalize messages: handle both {content: '...'} and {parts: [...]} formats
    const normalizedMessages = messages.map((m: any) => {
      if (typeof m.content === 'string') return m;
      if (m.parts && Array.isArray(m.parts)) {
        const textContent = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
        return { ...m, content: textContent };
      }
      return m;
    });

    const result = await streamText({
      // We can use any Groq model here, since we're connected to their API!
      model: groq('llama-3.1-8b-instant'),
      
      system: `You are a helpful Answer Engine. 
When a user asks for the weather, use the getWeather tool.
After you receive the tool's data, you MUST write a natural language sentence summarizing the weather for the user. Do not stop without answering.`,
      
      messages: normalizedMessages,
      
      // Allow up to 5 tool steps before forcing a response
      stopWhen: isStepCount(5),
      
      tools: {
        getWeather: tool({
          description: 'Get the current weather for a city',
          parameters: z.object({
            city: z.string().describe('The city name, e.g. Tokyo, London, Odisha'),
          }),
          // @ts-ignore
          execute: async ({ city }: { city: string }) => {
            console.log(`🔧 RAW ARGS IN EXECUTE:`, JSON.stringify({ city }));
            const cityName = city || "tokyo";
            
            const mockWeatherDB: Record<string, { temp: number; cond: string }> = {
              tokyo: { temp: 22, cond: 'Clear and pleasant' },
              london: { temp: 14, cond: 'Light drizzle' },
              odisha: { temp: 34, cond: 'Humid and sunny' },
            };

            const searchKey = cityName.toLowerCase();
            const weatherData = mockWeatherDB[searchKey] || { temp: 25, cond: 'Partly cloudy' };

            return {
              location: cityName,
              temperature: `${weatherData.temp}°C`,
              condition: weatherData.cond,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("🚨 ROUTE CRASHED:", error);
    return new Response(error.message || "Unknown error", { status: 500 });
  }
}