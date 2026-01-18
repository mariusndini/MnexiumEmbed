import { createHandlers } from '@mnexium/chat-react/server';

export const mnx = createHandlers({
  model: process.env.MODEL ?? 'gpt-4o-mini',
  cookiePrefix: 'mnx',
  mnxOptions: {
    history: true,
    learn: true,
    recall: true,
    profile: true,
    summarize: 'balanced',
  },
});
