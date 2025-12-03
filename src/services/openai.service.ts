import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ContextSource {
  type: string;
  title?: string;
  content: string;
}

export const generateChatResponse = async (
  currentMessage: string,
  history: { role: 'user' | 'model'; text: string }[],
  contextSources: ContextSource[],
  userSystemInstruction?: string
): Promise<string> => {
  // Build context block
  const contextBlock = contextSources
    .map((source, index) => {
      return `--- SOURCE ${index + 1} (${source.type.toUpperCase()}: ${source.title || 'Untitled'}) ---\n${source.content}\n----------------------------------`;
    })
    .join('\n\n');

  // System message with context
  const systemMessage = `You are an AI assistant in a node-based workflow app.
Use the provided CONTEXT SOURCES to answer the user's query.

${userSystemInstruction ? `USER DEFINED ROLE/INSTRUCTION: ${userSystemInstruction}` : ''}

CONTEXT SOURCES:
${contextBlock}`;

  // Convert history to OpenAI format
  const messages: Message[] = [
    { role: 'system', content: systemMessage },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
      content: msg.text,
    })),
    { role: 'user', content: currentMessage },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model: $0.15/1M input tokens
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || 'No response generated';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate response');
  }
};

// Export for transcription service
export { openai };
