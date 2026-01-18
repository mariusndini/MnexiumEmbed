# Next.js Demo

Minimal example of `@mnexium/chat-react` in a Next.js App Router project.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with your API keys:
   ```
   MNX_API_KEY=your_mnexium_key
   OPENAI_API_KEY=your_openai_key
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 and click the "Ask AI" button.

## Project Structure

```
src/app/
├── layout.tsx                    # Adds <MnexiumChat /> widget
├── page.tsx                      # Your app content
└── api/mnx/
    ├── bootstrap/route.ts        # GET /api/mnx/bootstrap
    └── chat/route.ts             # POST /api/mnx/chat
```

## Key Files

**layout.tsx** - Add the widget to your layout:
```tsx
import { MnexiumChat } from '@mnexium/chat-react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <MnexiumChat endpoint="/api/mnx" />
      </body>
    </html>
  );
}
```

**api/mnx/bootstrap/route.ts** - Bootstrap endpoint:
```ts
import { bootstrapHandler } from '@mnexium/chat-react/server';

export async function GET(req: Request) {
  return bootstrapHandler(req);
}
```

**api/mnx/chat/route.ts** - Chat endpoint:
```ts
import { chatHandler } from '@mnexium/chat-react/server';

export async function POST(req: Request) {
  return chatHandler(req);
}
```
