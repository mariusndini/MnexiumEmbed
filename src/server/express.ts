import { bootstrapHandler, newChatHandler, type BootstrapOptions } from './bootstrap';
import { chatHandler, type ChatOptions } from './chat';
import { historyHandler, conversationHandler } from './history';

// Express-compatible request/response types (minimal interface)
export interface ExpressRequest {
  body?: unknown;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: unknown): void;
  send(data: string | Buffer): void;
  setHeader(name: string, value: string): ExpressResponse;
  write(chunk: string | Buffer): boolean;
  end(): void;
  headersSent?: boolean;
}

export interface MnexiumExpressOptions {
  cookiePrefix?: string;
  chatOptions?: ChatOptions;
  bootstrapOptions?: BootstrapOptions;
}

// Convert Express request to Web API Request
function toWebRequest(req: ExpressRequest, body?: unknown): Request {
  // Build headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  // Build URL
  const protocol = req.protocol || (req.get?.('x-forwarded-proto')) || 'http';
  const host = req.headers.host || 'localhost';
  const url = `${protocol}://${host}${req.url || '/'}`;

  // Create Request
  const init: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers,
  };

  if (body) {
    init.body = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
  }

  return new Request(url, init);
}

// Send Web API Response to Express response
async function sendWebResponse(webRes: Response, res: ExpressResponse): Promise<void> {
  // Copy status
  res.status(webRes.status);

  // Copy headers
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Handle streaming response
  if (webRes.body) {
    const reader = webRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      res.end();
    }
  } else {
    // Non-streaming response
    const text = await webRes.text();
    res.send(text);
  }
}

export function createExpressMiddleware(options: MnexiumExpressOptions = {}) {
  const { cookiePrefix = 'mnx', chatOptions = {}, bootstrapOptions = {} } = options;

  return {
    // POST /chat
    chat: async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
      try {
        const webReq = toWebRequest(req, req.body);
        const webRes = await chatHandler(webReq, { ...chatOptions, cookiePrefix });
        await sendWebResponse(webRes, res);
      } catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },

    // GET /bootstrap
    bootstrap: async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
      try {
        const webReq = toWebRequest(req);
        const webRes = await bootstrapHandler(webReq, { ...bootstrapOptions, cookiePrefix });
        await sendWebResponse(webRes, res);
      } catch (error) {
        console.error('Bootstrap error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },

    // POST /new-chat
    newChat: async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
      try {
        const webReq = toWebRequest(req);
        const webRes = await newChatHandler(webReq, { ...bootstrapOptions, cookiePrefix });
        await sendWebResponse(webRes, res);
      } catch (error) {
        console.error('New chat error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },

    // GET /history
    history: async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
      try {
        const webReq = toWebRequest(req);
        const webRes = await historyHandler(webReq, { cookiePrefix });
        await sendWebResponse(webRes, res);
      } catch (error) {
        console.error('History error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },

    // GET /conversations/:chatId
    conversation: async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
      try {
        const chatId = req.params?.chatId;
        if (!chatId) {
          res.status(400).json({ error: 'Chat ID required' });
          return;
        }
        const webReq = toWebRequest(req);
        const webRes = await conversationHandler(webReq, chatId);
        await sendWebResponse(webRes, res);
      } catch (error) {
        console.error('Conversation error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },
  };
}

// Helper to mount all routes at once
export function mountMnexiumRoutes(
  app: { 
    get: (path: string, handler: (req: ExpressRequest, res: ExpressResponse) => Promise<void>) => void;
    post: (path: string, handler: (req: ExpressRequest, res: ExpressResponse) => Promise<void>) => void;
  },
  basePath: string,
  options: MnexiumExpressOptions = {}
): void {
  const handlers = createExpressMiddleware(options);
  
  app.get(`${basePath}/bootstrap`, handlers.bootstrap);
  app.post(`${basePath}/chat`, handlers.chat);
  app.post(`${basePath}/new-chat`, handlers.newChat);
  app.get(`${basePath}/history`, handlers.history);
  app.get(`${basePath}/conversations/:chatId`, handlers.conversation);
}

export { type ChatOptions, type BootstrapOptions };
