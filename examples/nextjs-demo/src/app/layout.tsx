import { MnexiumChat } from '@mnexium/chat-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#0a0a0a' }}>
        {children}
        <MnexiumChat endpoint="/api/mnx" />
      </body>
    </html>
  );
}
