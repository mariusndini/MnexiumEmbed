import { mnx } from '../../_mnx';

export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  return mnx.conversation(req, params.chatId);
}
