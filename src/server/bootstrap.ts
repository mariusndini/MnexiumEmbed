const MNEXIUM_API_BASE = 'https://www.mnexium.com/api/v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export interface BootstrapResponse {
  subject_id: string;
  chat_id: string;
}

export interface BootstrapOptions {
  cookiePrefix?: string;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Set version (4) and variant (RFC4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

function createCookie(name: string, value: string, secure: boolean = true): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export async function bootstrapHandler(
  req: Request,
  options: BootstrapOptions = {}
): Promise<Response> {
  const { cookiePrefix = 'mnx' } = options;
  const subjectCookieName = `${cookiePrefix}_subject`;
  const chatCookieName = `${cookiePrefix}_chat`;

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);

  let subjectId = cookies[subjectCookieName];
  let chatId = cookies[chatCookieName];
  const setCookies: string[] = [];

  const isSecure = req.url.startsWith('https://') || 
    req.headers.get('x-forwarded-proto') === 'https';

  // Generate subject_id if missing
  if (!subjectId) {
    subjectId = generateUUID();
    setCookies.push(createCookie(subjectCookieName, subjectId, isSecure));
  }

  // Get or generate chat_id
  if (!chatId) {
    const apiKey = process.env.MNX_API_KEY;
    
    if (apiKey) {
      try {
        // Try to get existing chat history
        const historyRes = await fetch(`${MNEXIUM_API_BASE}/history/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          // Use most recent chat if available
          if (historyData.chats && historyData.chats.length > 0) {
            chatId = historyData.chats[0].chat_id;
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
      }
    }

    // Generate new chat_id if none found
    if (!chatId) {
      chatId = generateUUID();
    }
    
    setCookies.push(createCookie(chatCookieName, chatId, isSecure));
  }

  const responseBody: BootstrapResponse = {
    subject_id: subjectId,
    chat_id: chatId,
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (setCookies.length > 0) {
    headers['Set-Cookie'] = setCookies.join(', ');
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers,
  });
}

export async function newChatHandler(
  req: Request,
  options: BootstrapOptions = {}
): Promise<Response> {
  const { cookiePrefix = 'mnx' } = options;
  const subjectCookieName = `${cookiePrefix}_subject`;
  const chatCookieName = `${cookiePrefix}_chat`;

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);

  let subjectId = cookies[subjectCookieName];
  const setCookies: string[] = [];

  const isSecure = req.url.startsWith('https://') || 
    req.headers.get('x-forwarded-proto') === 'https';

  // Generate subject_id if missing
  if (!subjectId) {
    subjectId = generateUUID();
    setCookies.push(createCookie(subjectCookieName, subjectId, isSecure));
  }

  // Always generate a new chat_id
  const chatId = generateUUID();
  setCookies.push(createCookie(chatCookieName, chatId, isSecure));

  const responseBody: BootstrapResponse = {
    subject_id: subjectId,
    chat_id: chatId,
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Set-Cookie': setCookies.join(', '),
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers,
  });
}

export default bootstrapHandler;
