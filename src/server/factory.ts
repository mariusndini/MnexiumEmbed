import { bootstrapHandler, newChatHandler, type BootstrapOptions } from './bootstrap';
import { chatHandler, type ChatOptions } from './chat';
import { historyHandler, conversationHandler, type HistoryOptions, type ConversationOptions } from './history';

export interface MnexiumHandlersConfig {
  model?: string;
  cookiePrefix?: string;
  mnxOptions?: {
    history?: boolean;
    learn?: boolean | 'force';
    recall?: boolean;
    profile?: boolean;
    summarize?: 'light' | 'balanced' | 'aggressive' | false;
    system_prompt?: string;
  };
}

export interface MnexiumHandlers {
  bootstrap: (req: Request) => Promise<Response>;
  chat: (req: Request) => Promise<Response>;
  newChat: (req: Request) => Promise<Response>;
  history: (req: Request) => Promise<Response>;
  conversation: (req: Request, chatId: string) => Promise<Response>;
}

/**
 * Creates a set of configured handlers for Mnexium chat endpoints.
 * This allows you to define your configuration once and reuse it across all routes.
 * 
 * @example
 * ```ts
 * // lib/mnx.ts
 * import { createHandlers } from '@mnexium/chat-react/server';
 * 
 * export const mnx = createHandlers({
 *   model: 'gpt-4o',
 *   cookiePrefix: 'mnx',
 *   mnxOptions: {
 *     history: true,
 *     learn: true,
 *     recall: true,
 *   },
 * });
 * 
 * // app/api/mnx/chat/route.ts
 * import { mnx } from '@/lib/mnx';
 * export const POST = mnx.chat;
 * ```
 */
export function createHandlers(config: MnexiumHandlersConfig = {}): MnexiumHandlers {
  const { model, cookiePrefix, mnxOptions } = config;

  const bootstrapOpts: BootstrapOptions = { cookiePrefix };
  const chatOpts: ChatOptions = { model, cookiePrefix, mnxOptions };
  const historyOpts: HistoryOptions = { cookiePrefix };
  const conversationOpts: ConversationOptions = { cookiePrefix };

  return {
    bootstrap: (req: Request) => bootstrapHandler(req, bootstrapOpts),
    chat: (req: Request) => chatHandler(req, chatOpts),
    newChat: (req: Request) => newChatHandler(req, bootstrapOpts),
    history: (req: Request) => historyHandler(req, historyOpts),
    conversation: (req: Request, chatId: string) => conversationHandler(req, chatId, conversationOpts),
  };
}

export default createHandlers;
