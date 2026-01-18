export interface StreamChunk {
  content: string;
  done: boolean;
}

export type ProviderType = 'openai' | 'anthropic' | 'google';

export function detectProvider(model: string): ProviderType {
  const lowerModel = model.toLowerCase();
  
  if (lowerModel.includes('claude')) {
    return 'anthropic';
  }
  
  if (lowerModel.includes('gemini')) {
    return 'google';
  }
  
  return 'openai';
}
