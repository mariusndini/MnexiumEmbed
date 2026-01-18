import { conversationHandler } from '@mnexium/chat-react/server';

export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  return conversationHandler(req, params.chatId);
}
