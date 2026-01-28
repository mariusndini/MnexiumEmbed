import { createNormalizerStream } from './providers';

const MNEXIUM_API_BASE = 'https://www.mnexium.com/api/v1';

export interface ChatOptions {
  model?: string;
  cookiePrefix?: string;
  chatPrefix?: string;
  mnxOptions?: {
    history?: boolean;
    learn?: boolean | 'force';
    recall?: boolean;
    profile?: boolean;
    summarize?: 'light' | 'balanced' | 'aggressive' | false;
    system_prompt?: string;
  };
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

export async function chatHandler(
  req: Request,
  options: ChatOptions = {}
): Promise<Response> {
  const {
    model = 'gpt-4o-mini',
    cookiePrefix = 'mnx',
    chatPrefix,
    mnxOptions = {
      history: true,
      learn: true,
      recall: true,
      profile: true,
      summarize: 'balanced',
    },
  } = options;

  const subjectCookieName = `${cookiePrefix}_subject`;
  const chatCookieName = chatPrefix ? `${cookiePrefix}${chatPrefix}_chat` : `${cookiePrefix}_chat`;

  // Parse cookies
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);

  const subjectId = cookies[subjectCookieName];
  const chatId = cookies[chatCookieName];

  if (!subjectId || !chatId) {
    return new Response(
      JSON.stringify({ error: 'Missing session cookies. Call /bootstrap first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message } = body;
  if (!message || typeof message !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid message field' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get API keys from environment
  const mnxApiKey = process.env.MNX_API_KEY?.trim();
  if (!mnxApiKey) {
    console.error('[Mnexium] MNX_API_KEY is not set. Please visit https://mnexium.com/docs#quickstart to get your API key.');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing MNX_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build headers for Mnexium API
  const headers: HeadersInit = {
    'x-mnexium-key': `${mnxApiKey}`,
    'Content-Type': 'application/json',
  };

  // Add provider API keys if available
  if (process.env.OPENAI_API_KEY) {
    headers['x-openai-key'] = process.env.OPENAI_API_KEY;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    headers['x-anthropic-key'] = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.GOOGLE_API_KEY) {
    headers['x-google-key'] = process.env.GOOGLE_API_KEY;
  }

  // Build request body for Mnexium
  const mnxPayload: Record<string, unknown> = {
    subject_id: subjectId,
    chat_id: chatId,
    history: mnxOptions.history ?? true,
    learn: mnxOptions.learn ?? true,
    recall: mnxOptions.recall ?? true,
    profile: mnxOptions.profile ?? true,
    summarize: mnxOptions.summarize ?? 'balanced',
  };

  // Add system_prompt if provided
  if (mnxOptions.system_prompt) {
    mnxPayload.system_prompt = mnxOptions.system_prompt;
  }

  const mnexiumBody = {
    model,
    messages: [{ role: 'user', content: message }],
    stream: true,
    mnx: mnxPayload,
  };

  // Forward request to Mnexium
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(`${MNEXIUM_API_BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mnexiumBody),
    });
  } catch (err) {
    console.error('Mnexium API error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to Mnexium API' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!upstreamRes.ok) {
    const errorText = await upstreamRes.text();
    console.error('Mnexium API error:', upstreamRes.status, errorText);
    return new Response(
      JSON.stringify({ error: 'Mnexium API error', details: errorText }),
      { status: upstreamRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream the response back to client without buffering
  if (!upstreamRes.body) {
    return new Response(
      JSON.stringify({ error: 'No response body from Mnexium' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Normalize the stream to OpenAI format (handles Anthropic, Google, etc.)
  const normalizedStream = upstreamRes.body.pipeThrough(createNormalizerStream(model));

  return new Response(normalizedStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export default chatHandler;
