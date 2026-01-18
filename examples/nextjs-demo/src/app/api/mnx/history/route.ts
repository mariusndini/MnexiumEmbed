import { historyHandler } from '@mnexium/chat-react/server';

export async function GET(req: Request) {
  return historyHandler(req);
}
