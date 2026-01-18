import { newChatHandler } from '@mnexium/chat-react/server';

export async function POST(req: Request) {
  return newChatHandler(req);
}
