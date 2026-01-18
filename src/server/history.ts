const MNEXIUM_API_BASE = 'https://www.mnexium.com/api/v1';

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

export interface HistoryOptions {
  cookiePrefix?: string;
}

export async function historyHandler(
  req: Request,
  options: HistoryOptions = {}
): Promise<Response> {
  const { cookiePrefix = 'mnx' } = options;
  const subjectCookieName = `${cookiePrefix}_subject`;

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const subjectId = cookies[subjectCookieName];

  if (!subjectId) {
    return new Response(
      JSON.stringify({ error: 'No subject ID found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = process.env.MNX_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing MNX_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(`${MNEXIUM_API_BASE}/history/${subjectId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Mnexium history error:', res.status, errorText);
      return new Response(
        JSON.stringify({ conversations: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    
    // Transform Mnexium response to our format
    const conversations = (data.chats || []).map((chat: { chat_id: string; title?: string; updated_at?: string; created_at?: string }) => ({
      id: chat.chat_id,
      title: chat.title || 'Untitled conversation',
      updated_at: chat.updated_at || chat.created_at || new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({ conversations }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Failed to fetch history:', err);
    return new Response(
      JSON.stringify({ conversations: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export interface ConversationOptions {
  cookiePrefix?: string;
}

export async function conversationHandler(
  req: Request,
  chatId: string,
  options: ConversationOptions = {}
): Promise<Response> {
  const { cookiePrefix = 'mnx' } = options;
  const subjectCookieName = `${cookiePrefix}_subject`;

  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const subjectId = cookies[subjectCookieName];

  if (!subjectId) {
    return new Response(
      JSON.stringify({ error: 'No subject ID found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = process.env.MNX_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing MNX_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = `${MNEXIUM_API_BASE}/chat/history/read?chat_id=${chatId}&subject_id=${subjectId}&limit=200`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Mnexium conversation error:', res.status, errorText);
      return new Response(
        JSON.stringify({ messages: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    console.log('Mnexium conversation response:', JSON.stringify(data, null, 2));
    
    // Transform Mnexium response - filter to only user and assistant messages
    // The API may return messages directly or nested under a key
    const rawMessages = data.messages || data.history || data || [];
    const messagesArray = Array.isArray(rawMessages) ? rawMessages : [];
    
    const messages = messagesArray
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; message?: string; content?: string }) => ({
        role: m.role,
        content: m.message || m.content || '',
      }))
      .filter((m: { content: string }) => m.content);

    return new Response(
      JSON.stringify({ messages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Failed to fetch conversation:', err);
    return new Response(
      JSON.stringify({ messages: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default { historyHandler, conversationHandler };
