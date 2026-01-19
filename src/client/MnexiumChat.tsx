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
  textColor?: string;
  defaultOpen?: boolean;
  logo?: string;
  theme?: 'light' | 'dark';
  welcomeIcon?: string;
  welcomeMessage?: string;
  history?: boolean;
  eagerInit?: boolean;
}

const themes = {
  dark: {
    bg: '#1a1a1a',
    bgSecondary: '#2a2a2a',
    border: '#333',
    text: '#fff',
    textSecondary: '#e5e5e5',
    textMuted: '#888',
    inputBg: '#2a2a2a',
    inputBorder: '#444',
    codeBg: '#374151',
    codeBlockBg: '#1f2937',
    tableBorderColor: '#444',
  },
  light: {
    bg: '#ffffff',
    bgSecondary: '#f3f4f6',
    border: '#e5e7eb',
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    inputBg: '#f9fafb',
    inputBorder: '#d1d5db',
    codeBg: '#e5e7eb',
    codeBlockBg: '#f3f4f6',
    tableBorderColor: '#d1d5db',
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function renderMarkdown(text: string, themeColors: { codeBg: string; codeBlockBg: string; tableBorderColor: string }): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let isHeaderRow = true;

  const parseTableRow = (line: string): string[] => {
    return line.split('|').map(cell => cell.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr.length === 2 && idx === 0));
  };

  const isTableSeparator = (line: string): boolean => {
    return /^\|?[\s-:|]+\|?$/.test(line) && line.includes('-');
  };

  const renderTable = (rows: string[][], key: number): React.ReactNode => {
    if (rows.length === 0) return null;
    const headerRow = rows[0];
    const bodyRows = rows.slice(1);
    
    return (
      <table key={key} style={{ 
        borderCollapse: 'collapse', 
        width: '100%', 
        margin: '8px 0', 
        fontSize: '13px',
        border: `1px solid ${themeColors.tableBorderColor}`,
      }}>
        <thead>
          <tr>
            {headerRow.map((cell, idx) => (
              <th key={idx} style={{ 
                border: `1px solid ${themeColors.tableBorderColor}`, 
                padding: '8px', 
                textAlign: 'left',
                fontWeight: 600,
                backgroundColor: themeColors.codeBlockBg,
              }}>
                {processInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} style={{ 
                  border: `1px solid ${themeColors.tableBorderColor}`, 
                  padding: '8px',
                }}>
                  {processInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const processInline = (line: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/\*([^*]+)\*/);
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

      const matches = [
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
        linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
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
          <code key={key++} style={{ backgroundColor: themeColors.codeBg, padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
            {first.match![1]}
          </code>
        );
      } else if (first.type === 'bold') {
        parts.push(<strong key={key++}>{first.match![1]}</strong>);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++}>{first.match![1]}</em>);
      } else if (first.type === 'link') {
        parts.push(
          <a key={key++} href={first.match![2]} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            {first.match![1]}
          </a>
        );
      }

      remaining = remaining.substring(first.index + first.match![0].length);
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inTable) {
        elements.push(renderTable(tableRows, i - tableRows.length));
        inTable = false;
        tableRows = [];
      }
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeContent = [];
      } else {
        elements.push(
          <pre key={i} style={{ backgroundColor: themeColors.codeBlockBg, padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', margin: '8px 0' }}>
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

    // Table handling
    const isTableRow = line.includes('|') && line.trim().startsWith('|');
    if (isTableRow) {
      if (isTableSeparator(line)) {
        // Skip separator row (e.g., |---|---|)
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(parseTableRow(line));
      continue;
    } else if (inTable) {
      // End of table
      elements.push(renderTable(tableRows, i - tableRows.length));
      inTable = false;
      tableRows = [];
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

  // Handle unclosed table at end
  if (inTable && tableRows.length > 0) {
    elements.push(renderTable(tableRows, lines.length));
  }

  if (inCodeBlock && codeContent.length > 0) {
    elements.push(
      <pre key="final-code" style={{ backgroundColor: themeColors.codeBlockBg, padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', margin: '8px 0' }}>
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
  textColor = '#000',
  defaultOpen = false,
  logo,
  theme = 'dark',
  welcomeIcon = '👋',
  welcomeMessage = 'How can I help you today?',
  history = false,
  eagerInit = true,
}: MnexiumChatProps) {
  const t = themes[theme];
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSize, setChatSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Scroll to bottom when chat opens - wait for animation to complete
      setTimeout(() => scrollToBottom(), 250);
    }
  }, [isOpen, scrollToBottom]);

  // Lock body scroll on mobile when chat is open
  useEffect(() => {
    if (!isMobile) return;
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (!eagerInit && !isOpen) return;
    
    const bootstrap = async () => {
      if (isInitialized) return;
      
      try {
        const res = await fetch(`${endpoint}/bootstrap`);
        if (!res.ok) throw new Error('Failed to bootstrap');
        
        const data = await res.json();
        
        if (history && data.chat_id) {
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
  }, [endpoint, isOpen, isInitialized, history, eagerInit]);

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
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = async () => {
    try {
      const res = await fetch(`${endpoint}/new-chat`, { method: 'POST' });
      if (res.ok) {
        setMessages([]);
      }
    } catch {
      // Fallback: just clear messages locally
      setMessages([]);
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
        @keyframes mnx-fade-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(10px) scale(0.95); }
        }
        @keyframes mnx-slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mnx-mobile-fade-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes mnx-pulse {
          0% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
          50% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); }
          100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
        }
        .mnx-typing-dot:nth-child(1) { animation-delay: 0s; }
        .mnx-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .mnx-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .mnx-btn-icon {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <div style={{
        position: 'fixed',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...positionStyles,
      }}>
        {isOpen && (
          <div style={{
            position: isMobile ? 'fixed' : 'absolute',
            ...(isMobile ? {
              left: '12px',
              right: '12px',
              top: '24px',
              bottom: '24px',
            } : chatPositionStyles),
            width: isMobile ? 'auto' : (chatSize === 'small' ? '320px' : chatSize === 'large' ? '547px' : '380px'),
            height: isMobile ? 'auto' : (chatSize === 'small' ? '400px' : chatSize === 'large' ? '600px' : '500px'),
            maxHeight: isMobile ? 'none' : undefined,
            backgroundColor: theme === 'dark' ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            borderRadius: '16px',
            border: `1px solid ${primaryColor}33`,
            boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: isMobile ? 'mnx-slide-up 0.3s ease-out' : 'mnx-fade-in 0.2s ease-out',
            transform: 'translateZ(0)',
            isolation: 'isolate',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 8px',
              borderBottom: `1px solid ${t.border}`,
              backgroundColor: theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)',
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
                  overflow: 'hidden',
                }}>
                  {logo ? (
                    <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  )}
                </div>
                <span style={{ color: t.text, fontWeight: 600, fontSize: '15px' }}>{title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={startNewChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: t.textMuted,
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="New chat"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                {!isMobile && (
                  <button
                    onClick={() => setChatSize(prev => prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: t.textMuted,
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s ease',
                    }}
                    title={`Size: ${chatSize}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {chatSize === 'small' ? (
                        <>
                          <polyline points="15 3 21 3 21 9"/>
                          <polyline points="9 21 3 21 3 15"/>
                        </>
                      ) : chatSize === 'large' ? (
                        <>
                          <polyline points="4 14 4 20 10 20"/>
                          <polyline points="20 10 20 4 14 4"/>
                        </>
                      ) : (
                        <>
                          <rect x="4" y="4" width="16" height="16" rx="2"/>
                        </>
                      )}
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: t.textMuted,
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
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {!isInitialized && !error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.textMuted }}>
                  Initializing...
                </div>
              )}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444' }}>
                  {error}
                </div>
              )}
              {isInitialized && messages.length === 0 && !error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.textMuted, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{welcomeIcon}</div>
                    <div>{welcomeMessage}</div>
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
                          backgroundColor: `${primaryColor}cc`,
                          color: textColor,
                          borderBottomRightRadius: '4px',
                        }
                      : {
                          alignSelf: 'flex-start',
                          backgroundColor: theme === 'dark' ? 'rgba(42, 42, 42, 0.7)' : 'rgba(243, 244, 246, 0.7)',
                          color: t.textSecondary,
                          borderBottomLeftRadius: '4px',
                        }
                    ),
                  }}
                >
                  {message.role === 'assistant' ? renderMarkdown(message.content, { codeBg: t.codeBg, codeBlockBg: t.codeBlockBg, tableBorderColor: t.tableBorderColor }) : message.content}
                </div>
              ))}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '10px 14px',
                  alignSelf: 'flex-start',
                  backgroundColor: theme === 'dark' ? 'rgba(42, 42, 42, 0.7)' : 'rgba(243, 244, 246, 0.7)',
                  borderRadius: '12px',
                  borderBottomLeftRadius: '4px',
                }}>
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: t.textMuted, borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: t.textMuted, borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                  <div className="mnx-typing-dot" style={{ width: '6px', height: '6px', backgroundColor: t.textMuted, borderRadius: '50%', animation: 'mnx-typing 1.4s infinite ease-in-out' }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '8px',
              borderTop: `1px solid ${t.border}`,
              backgroundColor: theme === 'dark' ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
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
                  backgroundColor: theme === 'dark' ? 'rgba(42, 42, 42, 0.6)' : 'rgba(249, 250, 251, 0.6)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: t.text,
                  outline: 'none',
                  transition: 'box-shadow 0.15s ease',
                }}
                onFocus={e => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}`;
                }}
                onBlur={e => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!isInitialized || !input.trim() || isLoading || isStreaming}
                style={{
                  padding: '10px 16px',
                  backgroundColor: !isInitialized || !input.trim() || isLoading || isStreaming ? t.inputBorder : primaryColor,
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

        {!(isMobile && isOpen) && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0' : '8px',
            padding: isMobile ? '14px' : '12px 16px',
            backgroundColor: primaryColor,
            color: textColor,
            border: 'none',
            borderRadius: isMobile ? '50%' : '12px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: isMobile ? '56px' : undefined,
            minHeight: isMobile ? '56px' : undefined,
            justifyContent: 'center',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          }}
        >
          <span 
            className={`mnx-btn-icon ${isOpen ? 'open' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isOpen ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : logo ? (
              <img src={logo} alt="" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            )}
          </span>
          {!isMobile && (
            <span style={{ 
              display: 'inline-flex',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative',
              height: '1.2em',
              alignItems: 'center',
            }}>
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isOpen ? 'translateY(-100%)' : 'translateY(0)',
                opacity: isOpen ? 0 : 1,
                maxWidth: isOpen ? '0' : '300px',
              }}>
                {buttonLabel}
              </span>
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                opacity: isOpen ? 1 : 0,
                maxWidth: isOpen ? '50px' : '0',
                overflow: 'hidden',
              }}>
                Close
              </span>
            </span>
          )}
        </button>
        )}
      </div>
    </>
  );
}

export default MnexiumChat;
