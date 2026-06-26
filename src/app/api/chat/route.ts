import { streamText, convertToModelMessages } from 'ai';
import { createGroq } from '@ai-sdk/groq';

// Initialize Groq using the key from your .env.local file
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        // We are using LLaMA 3.1 8B, which runs lightning fast on Groq hardware
        model: groq('llama-3.1-8b-instant'),
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}