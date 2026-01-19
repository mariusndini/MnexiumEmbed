# @mnexium/chat

A drop-in chat widget that gives any web app a full AI chat experience backed by [Mnexium](https://mnexium.com). Works with **React**, **Express**, or **vanilla JavaScript**.

![Mnexium Chat Demo](img/embed.png)

## Features

- **Framework Flexible** - React component, Express middleware, or vanilla JS client
- **Floating Widget** - Modern glassmorphism design with smooth animations
- **Persistent Memory** - Conversations and user context persist across sessions
- **Streaming Responses** - Real-time streaming with typing effect
- **Multi-Provider Support** - Works with OpenAI, Anthropic Claude, and Google Gemini
- **Markdown Rendering** - Rich formatting for assistant messages
- **Zero Client-Side Keys** - All API keys stay on your server
- **Theming** - Light and dark themes with customizable primary color
- **Mobile Optimized** - Full-screen chat on mobile with body scroll lock

## Installation

```bash
npm install @mnexium/chat
```

## Package Exports

| Import | Description |
|--------|-------------|
| `@mnexium/chat` | React component with full UI |
| `@mnexium/chat/browser` | Browser bundle (script tag, no build required) |
| `@mnexium/chat/core` | Vanilla JS client (framework-agnostic) |
| `@mnexium/chat/server` | Server handlers (Next.js + Express) |

## Quick Start (React + Next.js)

### 1. Add the Chat Widget

```tsx
import { MnexiumChat } from '@mnexium/chat';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <MnexiumChat endpoint="/api/mnx" />
    </>
  );
}
```

This adds a floating "Ask AI" button to the bottom-right of your page.

### 2. Set Up Server Routes

**`app/api/mnx/_mnx.ts`**

```ts
import { createHandlers } from '@mnexium/chat/server';

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
```

**`app/api/mnx/bootstrap/route.ts`**

```ts
import { mnx } from '../_mnx';
export const GET = mnx.bootstrap;
```

**`app/api/mnx/chat/route.ts`**

```ts
import { mnx } from '../_mnx';
export const POST = mnx.chat;
```

**`app/api/mnx/new-chat/route.ts`**

```ts
import { mnx } from '../_mnx';
export const POST = mnx.newChat;
```

**`app/api/mnx/conversations/[chatId]/route.ts`**

```ts
import { mnx } from '../../_mnx';

export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  return mnx.conversation(req, params.chatId);
}
```

### 3. Configure Environment Variables

```bash
# .env.local
MNX_API_KEY=mnx_live_...

# Include one or all of the following provider keys:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Optionally set the model (defaults to gpt-4o-mini)
# MODEL=gpt-4o-mini
# MODEL=claude-3-haiku-20240307
# MODEL=gemini-2.0-flash-lite
```

---

## Plain HTML (No Build Required)

For non-React apps, use the browser bundle with a simple script tag. **Same UI as React!**

### 1. Set Up Express Server

```javascript
import express from 'express';
import { mountMnexiumRoutes } from '@mnexium/chat/server';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Serve the browser bundle
app.get('/mnexium-chat.js', (req, res) => {
  res.sendFile(require.resolve('@mnexium/chat/browser'));
});

// Mount Mnexium API routes
mountMnexiumRoutes(app, '/api/mnx');

app.listen(3000);
```

### 2. Add Script Tag to HTML

```html
<!-- Just add this script tag! -->
<script 
  src="/mnexium-chat.js"
  data-endpoint="/api/mnx"
  data-title="Ask AI"
  data-button-label="Ask AI"
  data-theme="dark"
  data-history="true"
></script>
```

That's it! The floating chat button appears automatically.

### Script Data Attributes

| Attribute | Description |
|-----------|-------------|
| `data-endpoint` | API endpoint (default: `/api/mnx`) |
| `data-title` | Chat window title |
| `data-button-label` | Floating button label |
| `data-position` | `bottom-right` or `bottom-left` |
| `data-primary-color` | Accent color (hex) |
| `data-text-color` | Button text color |
| `data-theme` | `light` or `dark` |
| `data-logo` | Logo image URL |
| `data-welcome-icon` | Welcome emoji |
| `data-welcome-message` | Welcome text |
| `data-default-open` | `true` to start open |
| `data-history` | `true` to load history |
| `data-eager-init` | `false` to delay init |

### Programmatic Usage

```html
<script src="/mnexium-chat.js" data-auto-init="false"></script>
<script>
  // Render manually with options
  MnexiumChat.render({
    endpoint: '/api/mnx',
    title: 'Support',
    primaryColor: '#45b1eb',
    theme: 'dark',
  });
</script>
```

---

## Vanilla JS Client (Build Your Own UI)

For custom UIs, use the core client directly:

```javascript
import { MnexiumClient } from '@mnexium/chat/core';

const chat = new MnexiumClient({ endpoint: '/api/mnx', history: true });

chat.onMessage((messages) => renderMessages(messages));
chat.onStateChange((state) => updateUI(state));

await chat.init();
await chat.send('Hello!');
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | `'/api/mnx'` | Base URL for API routes |
| `title` | `string` | `'Ask AI'` | Chat window header title |
| `buttonLabel` | `string` | `'Ask AI'` | Floating button label |
| `placeholder` | `string` | `'Type a message...'` | Input placeholder |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Widget position |
| `primaryColor` | `string` | `'#facc15'` | Accent color (use 6-char hex, e.g. `#45b1eb`) |
| `textColor` | `string` | `'#000'` | Text color for button and user messages |
| `theme` | `'light' \| 'dark'` | `'dark'` | Color theme |
| `defaultOpen` | `boolean` | `false` | Start with chat open |
| `eagerInit` | `boolean` | `true` | Initialize on page load (no "Initializing..." delay) |
| `logo` | `string` | - | URL to custom logo image |
| `welcomeIcon` | `string` | `'👋'` | Emoji shown in empty chat |
| `welcomeMessage` | `string` | `'How can I help you today?'` | Welcome message |
| `history` | `boolean` | `false` | Load previous conversation on open |

## Server Handler Options

### `createHandlers(config)` (Recommended)

Creates all handlers with shared configuration:

```ts
const mnx = createHandlers({
  model: 'gpt-4o-mini',
  cookiePrefix: 'mnx',
  mnxOptions: { ... },
});

// Returns: { bootstrap, chat, newChat, history, conversation }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `'gpt-4o-mini'` | LLM model to use |
| `cookiePrefix` | `string` | `'mnx'` | Prefix for session cookies |
| `mnxOptions.history` | `boolean` | `true` | Enable conversation history |
| `mnxOptions.learn` | `boolean \| 'force'` | `true` | Extract and store memories |
| `mnxOptions.recall` | `boolean` | `true` | Inject relevant memories |
| `mnxOptions.profile` | `boolean` | `true` | Include user profile |
| `mnxOptions.summarize` | `'light' \| 'balanced' \| 'aggressive' \| false` | `'balanced'` | Summarization mode |
| `mnxOptions.system_prompt` | `string` | - | System prompt text for the AI assistant |

### Individual Handlers

You can also import handlers individually:

```ts
import { bootstrapHandler, chatHandler, newChatHandler, historyHandler, conversationHandler } from '@mnexium/chat/server';
```

### Express Middleware

For Express apps, use `createExpressMiddleware` or `mountMnexiumRoutes`:

```ts
import { createExpressMiddleware, mountMnexiumRoutes } from '@mnexium/chat/server';

// Option 1: Mount all routes at once
mountMnexiumRoutes(app, '/api/mnx');

// Option 2: Use individual middleware handlers
const mnx = createExpressMiddleware({ cookiePrefix: 'mnx' });
app.get('/api/mnx/bootstrap', mnx.bootstrap);
app.post('/api/mnx/chat', mnx.chat);
app.post('/api/mnx/new-chat', mnx.newChat);
app.get('/api/mnx/conversations/:chatId', mnx.conversation);
```

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
│       ├── _mnx.ts           # Shared config
│       ├── bootstrap/
│       │   └── route.ts
│       ├── chat/
│       │   └── route.ts
│       ├── new-chat/
│       │   └── route.ts
│       └── conversations/
│           └── [chatId]/
│               └── route.ts
└── layout.tsx
```

**`app/layout.tsx`**

```tsx
import { MnexiumChat } from '@mnexium/chat';

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
          primaryColor="#45b1eb"
          textColor="#fff"
          theme="dark"
          logo="/logo.png"
          welcomeIcon="🤖"
          welcomeMessage="Ask me anything!"
          history={true}
        />
      </body>
    </html>
  );
}
```

## Full Express Example

```
project/
├── server.js
├── public/
│   └── index.html
├── package.json
└── .env
```

**`server.js`**

```javascript
import 'dotenv/config';
import express from 'express';
import { createRequire } from 'module';
import { mountMnexiumRoutes } from '@mnexium/chat/server';

const require = createRequire(import.meta.url);

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Serve the browser bundle
app.get('/mnexium-chat.js', (req, res) => {
  res.sendFile(require.resolve('@mnexium/chat/browser'));
});

// Mount API routes
mountMnexiumRoutes(app, '/api/mnx');

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

**`public/index.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>Welcome</h1>
  
  <!-- Mnexium Chat Widget -->
  <script 
    src="/mnexium-chat.js"
    data-endpoint="/api/mnx"
    data-theme="dark"
  ></script>
</body>
</html>
```

**`.env`**

```bash
MNX_API_KEY=mnx_live_...
OPENAI_API_KEY=sk-...
```

See `examples/express-demo` for a complete working example.

## License

MIT
