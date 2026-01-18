import { bootstrapHandler } from '@mnexium/chat-react/server';

export async function GET(req: Request) {
  return bootstrapHandler(req);
}

