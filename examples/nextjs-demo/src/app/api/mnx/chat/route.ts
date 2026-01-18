import { chatHandler } from '@mnexium/chat-react/server';

export async function POST(req: Request) {
  return chatHandler(req);
}
