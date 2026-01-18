import { MnexiumChat } from '@mnexium/chat-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, backgroundColor: '#0a0a0a' }}>
        {children}
        <MnexiumChat 
          endpoint="/api/mnx" 
          title="Ask AI"
          buttonLabel="Ask & chat with our AI"
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
