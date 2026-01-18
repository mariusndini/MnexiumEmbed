/**
 * Anthropic streaming format parser
 * Format: data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"content"}}
 */

export function parseAnthropicChunk(data: string): string | null {
  if (data === '[DONE]') return null;
  
  try {
    const parsed = JSON.parse(data);
    
    // Handle content_block_delta events
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return parsed.delta.text || null;
    }
    
    // Handle message_delta for stop events
    if (parsed.type === 'message_delta') {
      return null;
    }
    
    // Handle message_start, content_block_start, etc.
    return null;
  } catch {
    return null;
  }
}

export function isAnthropicFormat(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return 'type' in parsed && (
      parsed.type === 'message_start' ||
      parsed.type === 'content_block_start' ||
      parsed.type === 'content_block_delta' ||
      parsed.type === 'content_block_stop' ||
      parsed.type === 'message_delta' ||
      parsed.type === 'message_stop'
    );
  } catch {
    return false;
  }
}
