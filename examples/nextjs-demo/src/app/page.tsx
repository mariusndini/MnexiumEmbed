export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      color: '#fff',
      padding: '60px 20px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>
          Mnexium Chat Demo
        </h1>
        <p style={{ fontSize: '18px', color: '#888', marginBottom: '40px' }}>
          Click the <strong style={{ color: '#facc15' }}>Ask AI</strong> button in the bottom-right corner to start chatting.
        </p>
        
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          borderRadius: '12px', 
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Features</h2>
          <ul style={{ lineHeight: 2, color: '#ccc' }}>
            <li>Persistent memory across sessions</li>
            <li>Real-time streaming responses</li>
            <li>Markdown rendering</li>
            <li>Dark theme UI</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#1a1a1a', 
          borderRadius: '12px', 
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Setup</h2>
          <ol style={{ lineHeight: 2, color: '#ccc' }}>
            <li>Copy <code>.env.local.example</code> to <code>.env.local</code></li>
            <li>Add your <code>MNX_API_KEY</code> and <code>OPENAI_API_KEY</code></li>
            <li>Run <code>npm run dev</code></li>
          </ol>
        </div>
      </div>
    </main>
  );
}
