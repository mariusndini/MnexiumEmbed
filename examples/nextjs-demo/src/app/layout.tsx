import { MnexiumChat } from '@mnexium/chat-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#0a0a0a' }}>
        {children}
        <MnexiumChat 
          endpoint="/api/mnx" 
          title="Ask AI"
          buttonLabel="Ask AI"
          position="bottom-right"
          primaryColor="#45b1ebff"
          theme="dark"
          logo="/logo.png"
 
          welcomeIcon="🤖"
          welcomeMessage="Ask me anything!"
        />
      </body>
    </html>
  );
}
