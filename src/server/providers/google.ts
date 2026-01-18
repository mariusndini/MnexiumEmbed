/**
 * Google Gemini streaming format parser
 * Format: data: {"candidates":[{"content":{"parts":[{"text":"content"}]}}]}
 */

export function parseGoogleChunk(data: string): string | null {
  if (data === '[DONE]') return null;
  
  try {
    const parsed = JSON.parse(data);
    
    // Handle Gemini format
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    
    return null;
  } catch {
    return null;
  }
}

export function isGoogleFormat(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return 'candidates' in parsed;
  } catch {
    return false;
  }
}
