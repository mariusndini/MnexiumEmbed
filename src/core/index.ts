export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MnexiumClientOptions {
  endpoint?: string;
  history?: boolean;
}

export interface MnexiumClientState {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isInitialized: boolean;
  error: string | null;
}

type MessageCallback = (messages: Message[]) => void;
type StateCallback = (state: MnexiumClientState) => void;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export class MnexiumClient {
  private endpoint: string;
  private history: boolean;
  private _messages: Message[] = [];
  private _isLoading = false;
  private _isStreaming = false;
  private _isInitialized = false;
  private _error: string | null = null;
  
  private messageCallbacks: Set<MessageCallback> = new Set();
  private stateCallbacks: Set<StateCallback> = new Set();

  constructor(options: MnexiumClientOptions = {}) {
    this.endpoint = options.endpoint || '/api/mnx';
    this.history = options.history ?? false;
  }

  // Getters for state
  get messages(): Message[] {
    return [...this._messages];
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get isStreaming(): boolean {
    return this._isStreaming;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get error(): string | null {
    return this._error;
  }

  get state(): MnexiumClientState {
    return {
      messages: this.messages,
      isLoading: this._isLoading,
      isStreaming: this._isStreaming,
      isInitialized: this._isInitialized,
      error: this._error,
    };
  }

  // Event subscriptions
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  private notifyMessageChange(): void {
    const messages = this.messages;
    this.messageCallbacks.forEach(cb => cb(messages));
  }

  private notifyStateChange(): void {
    const state = this.state;
    this.stateCallbacks.forEach(cb => cb(state));
  }

  private setMessages(messages: Message[]): void {
    this._messages = messages;
    this.notifyMessageChange();
    this.notifyStateChange();
  }

  private addMessage(message: Message): void {
    this._messages = [...this._messages, message];
    this.notifyMessageChange();
    this.notifyStateChange();
  }

  private updateMessage(id: string, content: string): void {
    this._messages = this._messages.map(m =>
      m.id === id ? { ...m, content } : m
    );
    this.notifyMessageChange();
    this.notifyStateChange();
  }

  private appendToMessage(id: string, content: string): void {
    this._messages = this._messages.map(m =>
      m.id === id ? { ...m, content: m.content + content } : m
    );
    this.notifyMessageChange();
    this.notifyStateChange();
  }

  private removeMessage(id: string): void {
    this._messages = this._messages.filter(m => m.id !== id);
    this.notifyMessageChange();
    this.notifyStateChange();
  }

  private setLoading(loading: boolean): void {
    this._isLoading = loading;
    this.notifyStateChange();
  }

  private setStreaming(streaming: boolean): void {
    this._isStreaming = streaming;
    this.notifyStateChange();
  }

  private setInitialized(initialized: boolean): void {
    this._isInitialized = initialized;
    this.notifyStateChange();
  }

  private setError(error: string | null): void {
    this._error = error;
    this.notifyStateChange();
  }

  // Initialize the client (bootstrap + load history)
  async init(): Promise<void> {
    if (this._isInitialized) return;

    try {
      const res = await fetch(`${this.endpoint}/bootstrap`);
      if (!res.ok) throw new Error('Failed to bootstrap');

      const data = await res.json();

      if (this.history && data.chat_id) {
        try {
          const historyRes = await fetch(`${this.endpoint}/conversations/${data.chat_id}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.messages && Array.isArray(historyData.messages)) {
              this.setMessages(
                historyData.messages.map((m: { role: string; content: string }) => ({
                  id: generateId(),
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: new Date(),
                }))
              );
            }
          }
        } catch {
          // History endpoint is optional
        }
      }

      this.setInitialized(true);
    } catch (err) {
      this.setError('Failed to initialize chat');
      console.error('Bootstrap error:', err);
      throw err;
    }
  }

  // Send a message
  async send(content: string): Promise<void> {
    if (!content.trim() || this._isLoading || this._isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    this.addMessage(userMessage);
    this.setLoading(true);
    this.setError(null);

    const assistantMessageId = generateId();

    try {
      const res = await fetch(`${this.endpoint}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      if (!res.body) throw new Error('No response body');

      this.setLoading(false);
      this.setStreaming(true);

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      this.addMessage(assistantMessage);

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
                this.appendToMessage(assistantMessageId, content);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              this.appendToMessage(assistantMessageId, content);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      this.setError('Failed to send message');
      console.error('Chat error:', err);
      this.removeMessage(assistantMessageId);
      throw err;
    } finally {
      this.setLoading(false);
      this.setStreaming(false);
    }
  }

  // Start a new chat
  async newChat(): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}/new-chat`, { method: 'POST' });
      if (res.ok) {
        this.setMessages([]);
      }
    } catch {
      // Fallback: just clear messages locally
      this.setMessages([]);
    }
  }

  // Cleanup
  destroy(): void {
    this.messageCallbacks.clear();
    this.stateCallbacks.clear();
  }
}

export default MnexiumClient;
