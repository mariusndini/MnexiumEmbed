/**
 * OpenAI streaming format parser
 * Format: data: {"choices":[{"delta":{"content":"text"}}]}
 */

export function parseOpenAIChunk(data: string): string | null {
  if (data === '[DONE]') return null;
  
  try {
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content || null;
  } catch {
    return null;
  }
}

export function isOpenAIFormat(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return 'choices' in parsed;
  } catch {
    return false;
  }
}
