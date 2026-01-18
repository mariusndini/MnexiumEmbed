'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MnexiumChatProps {
  endpoint?: string;
  placeholder?: string;
  title?: string;
  buttonLabel?: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  defaultOpen?: boolean;
  logo?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];

  const processInline = (line: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/\*([^*]+)\*/);

      const matches = [
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.substring(0, first.index));
      }

      if (first.type === 'code') {
        parts.push(
          <code key={key++} style={{ backgroundColor: '#374151', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
            {first.match![1]}
          </code>
        );
      } else if (first.type === 'bold') {
        parts.push(<strong key={key++}>{first.match![1]}</strong>);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++}>{first.match![1]}</em>);
      }

      remaining = remaining.substring(first.index + first.match![0].length);
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeContent = [];
      } else {
        elements.push(
          <pre key={i} style={{ backgroundColor: '#1f2937', color: '#f9fafb', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', margin: '8px 0' }}>
            <code>{codeContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} style={{ margin: '12px 0 8px', fontSize: '14px', fontWeight: 600 }}>{processInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ margin: '12px 0 8px', fontSize: '15px', fontWeight: 600 }}>{processInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ margin: '12px 0 8px', fontSize: '16px', fontWeight: 600 }}>{processInline(line.slice(2))}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} style={{ marginLeft: '16px', listStyleType: 'disc' }}>{processInline(line.slice(2))}</li>);
    } else if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      elements.push(<li key={i} style={{ marginLeft: '16px', listStyleType: 'decimal' }}>{processInline(content)}</li>);
    } else if (line.trim() === '') {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} style={{ margin: '4px 0' }}>{processInline(line)}</p>);
    }
  }

  if (inCodeBlock && codeContent.length > 0) {
    elements.push(
      <pre key="final-code" style={{ backgroundColor: '#1f2937', color: '#f9fafb', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', margin: '8px 0' }}>
        <code>{codeContent.join('\n')}</code>
      </pre>
    );
  }

  return <div>{elements}</div>;
}

export function MnexiumChat({
  endpoint = '/api/mnx',
  placeholder = 'Type a message...',
  title = 'Ask AI',
  buttonLabel = 'Ask AI',
  position = 'bottom-right',
  primaryColor = '#facc15',
  defaultOpen = false,
  logo,
}: MnexiumChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const bootstrap = async () => {
      if (isInitialized) return;
      
      try {
        const res = await fetch(`${endpoint}/bootstrap`);
        if (!res.ok) throw new Error('Failed to bootstrap');
        
        const data = await res.json();
        
        if (data.chat_id) {
          try {
            const historyRes = await fetch(`${endpoint}/conversations/${data.chat_id}`);
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              if (historyData.messages && Array.isArray(historyData.messages)) {
                setMessages(historyData.messages.map((m: { role: string; content: string }) => ({
                  id: generateId(),
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: new Date(),
                })));
              }
            }
          } catch {
            // History endpoint is optional
          }
        }
        
        setIsInitialized(true);
      } catch (err) {
        setError('Failed to initialize chat');
        console.error('Bootstrap error:', err);
      }
    };

    bootstrap();
  }, [endpoint, isOpen, isInitialized]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const assistantMessageId = generateId();

    try {
      const res = await fetch(`${endpoint}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      if (!res.body) throw new Error('No response body');

      setIsLoading(false);
      setIsStreaming(true);

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + content }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + content }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Chat error:', err);
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionStyles = position === 'bottom-right' 
    ? { right: '20px', bottom: '20px' }
    : { left: '20px', bottom: '20px' };

  const chatPositionStyles = position === 'bottom-right'
    ? { right: '0', bottom: '60px' }
    : { left: '0', bottom: '60px' };

  return (
    <>
      <style>{`
        @keyframes mnx-typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes mnx-fade-in {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mnx-typing-dot:nth-child(1) { animation-delay: 0s; }
        .mnx-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .mnx-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div style={{
        position: 'fixed',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...positionStyles,
      }}>
        {isOpen && (
          <div style={{
            position: 'absolute',
            ...chatPositionStyles,
            width: '380px',
            height: '500px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'mnx-fade-in 0.2s ease-out',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #333',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: primaryColor,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{title}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {!isInitialized && !error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                  Initializing...
                </div>
              )}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444' }}>
                  {error}
                </div>
              )}
              {isInitialized && messages.length === 0 && !error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>👋</div>
                    <div>How can I help you today?</div>
                  </div>
                </div>
              )}
              {messages.map(message => (
                <div
                  key={message.id}
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    ...(message.role === 'user' 
                      ? { 
                          alignSelf: 'flex-end',
                          backgroundColor: primaryColor,
                          color: '#000',
                          borderBottomRightRadius: '4px',
                        }
                      : {
                          alignSelf: 'flex-start',
                          backgroundColor: '#2a2a2a',
                          color: '#e5e5e5',
                          borderBottomLeftRadius: '4px',
                        }
                    ),
                  }}
                >
                  {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                </div>
              ))}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '10px 14px',
                  alignSelf: 'flex-start',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  borderBottomLeftRadius: '4px',
                }}>
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#666', borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#666', borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#666', borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '16px 20px',
              borderTop: '1px solid #333',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={!isInitialized || isLoading || isStreaming}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!isInitialized || !input.trim() || isLoading || isStreaming}
                style={{
                  padding: '10px 16px',
                  backgroundColor: !isInitialized || !input.trim() || isLoading || isStreaming ? '#444' : primaryColor,
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: !isInitialized || !input.trim() || isLoading || isStreaming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: primaryColor,
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          }}
        >
          {logo ? (
            <img src={logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          )}
          {buttonLabel}
        </button>
      </div>
    </>
  );
}

export default MnexiumChat;
