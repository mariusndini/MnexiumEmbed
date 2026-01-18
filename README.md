# @mnexium/chat-react

A drop-in React chat widget that gives any web app a full AI chat experience backed by [Mnexium](https://mnexium.com).

## Features

- **Floating Widget** - Minimal button that expands into a chat popup
- **Persistent Memory** - Conversations and user context persist across sessions
- **Streaming Responses** - Real-time streaming with typing effect
- **Markdown Rendering** - Rich formatting for assistant messages
- **Zero Client-Side Keys** - All API keys stay on your server
- **Framework Agnostic** - Works with Next.js, Vite, CRA, and any React app

## Installation

```bash
npm install @mnexium/chat-react
```

## Quick Start

### 1. Add the Chat Widget

```tsx
import { MnexiumChat } from '@mnexium/chat-react';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <MnexiumChat endpoint="/api/mnx" />
    </>
  );
}
```

This adds a floating "Ask AI" button to the bottom-right of your page. Click it to open the chat.

### 2. Set Up Server Routes

#### Next.js App Router

**`app/api/mnx/bootstrap/route.ts`**

```ts
import { bootstrapHandler } from '@mnexium/chat-react/server';

export async function GET(req: Request) {
  return bootstrapHandler(req);
}
```

**`app/api/mnx/chat/route.ts`**

```ts
import { chatHandler } from '@mnexium/chat-react/server';

export async function POST(req: Request) {
  return chatHandler(req, {
    model: 'gpt-4o-mini',
    mnxOptions: {
      history: true,
      learn: true,
      recall: true,
      profile: true,
      summarize: 'balanced',
    },
  });
}
```

### 3. Configure Environment Variables

```bash
# .env.local
MNX_API_KEY=mnx_live_...

# At least one provider key:
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
GOOGLE_API_KEY=...
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | `'/api/mnx'` | Base URL for API routes |
| `title` | `string` | `'Ask AI'` | Chat window header title |
| `buttonLabel` | `string` | `'Ask AI'` | Floating button label |
| `placeholder` | `string` | `'Type a message...'` | Input placeholder |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Widget position |
| `primaryColor` | `string` | `'#facc15'` | Accent color (button, user messages) |
| `defaultOpen` | `boolean` | `false` | Start with chat open |

## Server Handler Options

### `bootstrapHandler(req, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookiePrefix` | `string` | `'mnx'` | Prefix for session cookies |

### `chatHandler(req, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `'gpt-4o-mini'` | LLM model to use |
| `cookiePrefix` | `string` | `'mnx'` | Prefix for session cookies |
| `mnxOptions.history` | `boolean` | `true` | Enable conversation history |
| `mnxOptions.learn` | `boolean \| 'force'` | `true` | Extract and store memories |
| `mnxOptions.recall` | `boolean` | `true` | Inject relevant memories |
| `mnxOptions.profile` | `boolean` | `true` | Include user profile |
| `mnxOptions.summarize` | `'light' \| 'balanced' \| 'aggressive' \| false` | `'balanced'` | Summarization mode |

## Supported Models

**OpenAI:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`, `o1`, `o1-mini`

**Anthropic:** `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `claude-3-5-sonnet`, `claude-sonnet-4`

**Google Gemini:** `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`

## How It Works

1. **On mount**, the client calls `GET /api/mnx/bootstrap`
2. Server generates or retrieves `subject_id` and `chat_id` from cookies
3. If a previous chat exists, it's loaded from Mnexium history
4. **On send**, the client `POST`s to `/api/mnx/chat`
5. Server forwards to Mnexium with memory/history flags
6. Response streams back to client in real-time

All API keys remain server-side. The client never sees or constructs Mnexium requests.

## Full Next.js Example

```
app/
├── api/
│   └── mnx/
│       ├── bootstrap/
│       │   └── route.ts
│       └── chat/
│           └── route.ts
└── layout.tsx
```

**`app/layout.tsx`**

```tsx
import { MnexiumChat } from '@mnexium/chat-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <MnexiumChat 
          endpoint="/api/mnx"
          title="Ask AI"
          buttonLabel="Ask AI"
          position="bottom-right"
          primaryColor="#facc15"
        />
      </body>
    </html>
  );
}
```

The widget appears as a floating button on every page. Users click to open the chat popup.

## License

MIT
