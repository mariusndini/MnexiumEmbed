import React from 'react';
import { createRoot } from 'react-dom/client';
import { MnexiumChat, MnexiumChatProps } from './client/MnexiumChat';

// Auto-render function for browser usage
function render(props: MnexiumChatProps = {}, containerId?: string) {
  // Create or find container
  let container: HTMLElement | null = null;
  
  if (containerId) {
    container = document.getElementById(containerId);
  }
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'mnexium-chat-root';
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(<MnexiumChat {...props} />);
  
  return root;
}

// Auto-initialize from script data attributes
function autoInit() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const props: MnexiumChatProps = {};
  
  // Parse data attributes
  if (script.dataset.endpoint) props.endpoint = script.dataset.endpoint;
  if (script.dataset.title) props.title = script.dataset.title;
  if (script.dataset.buttonLabel) props.buttonLabel = script.dataset.buttonLabel;
  if (script.dataset.placeholder) props.placeholder = script.dataset.placeholder;
  if (script.dataset.position) props.position = script.dataset.position as 'bottom-right' | 'bottom-left';
  if (script.dataset.primaryColor) props.primaryColor = script.dataset.primaryColor;
  if (script.dataset.textColor) props.textColor = script.dataset.textColor;
  if (script.dataset.theme) props.theme = script.dataset.theme as 'light' | 'dark';
  if (script.dataset.logo) props.logo = script.dataset.logo;
  if (script.dataset.welcomeIcon) props.welcomeIcon = script.dataset.welcomeIcon;
  if (script.dataset.welcomeMessage) props.welcomeMessage = script.dataset.welcomeMessage;
  if (script.dataset.defaultOpen === 'true') props.defaultOpen = true;
  if (script.dataset.history === 'true') props.history = true;
  if (script.dataset.eagerInit === 'false') props.eagerInit = false;

  // Auto-render if data-auto-init is set
  if (script.dataset.autoInit !== 'false') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => render(props));
    } else {
      render(props);
    }
  }
}

// Export for programmatic use
export { MnexiumChat, render };

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { MnexiumChat: { render: typeof render; Component: typeof MnexiumChat } }).MnexiumChat = {
    render,
    Component: MnexiumChat,
  };
  
  // Auto-init on load
  autoInit();
}
