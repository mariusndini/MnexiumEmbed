/**
 * Stream normalizer - converts all provider formats to OpenAI-compatible SSE
 * This ensures the client only needs to handle one format
 */

import { parseOpenAIChunk, isOpenAIFormat } from './openai';
import { parseAnthropicChunk, isAnthropicFormat } from './anthropic';
import { parseGoogleChunk, isGoogleFormat } from './google';
import { detectProvider, type ProviderType } from './types';

/**
 * Parse a chunk from any provider and extract the content
 */
export function parseChunk(data: string, provider?: ProviderType): string | null {
  if (data === '[DONE]') return null;
  
  // If provider is specified, use that parser
  if (provider === 'anthropic') {
    return parseAnthropicChunk(data);
  }
  if (provider === 'google') {
    return parseGoogleChunk(data);
  }
  if (provider === 'openai') {
    return parseOpenAIChunk(data);
  }
  
  // Auto-detect format
  if (isOpenAIFormat(data)) {
    return parseOpenAIChunk(data);
  }
  if (isAnthropicFormat(data)) {
    return parseAnthropicChunk(data);
  }
  if (isGoogleFormat(data)) {
    return parseGoogleChunk(data);
  }
  
  return null;
}

/**
 * Convert content to OpenAI-compatible SSE format
 */
export function toOpenAIFormat(content: string): string {
  const chunk = {
    choices: [{
      delta: { content },
      index: 0,
      finish_reason: null,
    }],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Create a transform stream that normalizes any provider format to OpenAI format
 */
export function createNormalizerStream(model: string): TransformStream<Uint8Array, Uint8Array> {
  const provider = detectProvider(model);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            continue;
          }

          const content = parseChunk(data, provider);
          if (content) {
            controller.enqueue(encoder.encode(toOpenAIFormat(content)));
          }
        } else if (line.startsWith('event: ')) {
          // Skip event lines (Anthropic uses these)
          continue;
        }
      }
    },
    flush(controller) {
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data && data !== '[DONE]') {
          const content = parseChunk(data, provider);
          if (content) {
            controller.enqueue(encoder.encode(toOpenAIFormat(content)));
          }
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    },
  });
}
