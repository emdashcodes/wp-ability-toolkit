# @automattic/agenttic-ai-sdk-bridge

Client-side bridge between WordPress REST API and Agenttic UI components.

## Overview

This package provides a React hook (`useWordPressChat`) that matches the `useAgentChat` interface from `@automattic/agenttic-client`, but communicates with a WordPress REST API backend instead of the A2A protocol.

## Features

- ✅ Compatible with Agenttic UI components
- ✅ WordPress REST API communication
- ✅ Streaming response support with smooth delta accumulation
- ✅ Message transformation (WordPress ↔ Agenttic UI format)
- ✅ Conversation persistence with localStorage
- ✅ Configurable request timeout
- ✅ TypeScript support
- ✅ Zero backend dependencies (pure client-side)

## Usage

```typescript
import { useWordPressChat } from '@automattic/agenttic-ai-sdk-bridge';
import { AgentUI } from '@automattic/agenttic-ui';

function MyChat() {
  const chatProps = useWordPressChat({
    endpoint: '/wp-json/ability-tester/v1/chat',
    nonce: window.myPlugin.nonce,
  });

  return <AgentUI {...chatProps} />;
}
```

## API

### `useWordPressChat(config)`

Configuration:

- `endpoint` (string, required): WordPress REST API endpoint
- `nonce` (string, required): WordPress nonce for authentication
- `timeout` (number, optional): Request timeout in milliseconds. Default: `120000` (2 minutes)
- `enableStreaming` (boolean, optional): Enable SSE streaming mode. Default: `true`
- `conversationStorageKey` (string, optional): localStorage key for conversation persistence. If provided, the conversation will be automatically saved and restored.
- `onToolCall` (function, optional): Callback invoked when a tool call is executed

Returns the same interface as `useAgentChat` from `@automattic/agenttic-client`.

### Example with All Options

```typescript
import { useWordPressChat } from '@automattic/agenttic-ai-sdk-bridge';
import { AgentUI } from '@automattic/agenttic-ui';

function MyChat() {
  const chatProps = useWordPressChat({
    endpoint: '/wp-json/ability-tester/v1/chat',
    nonce: window.myPlugin.nonce,
    timeout: 60000, // 1 minute timeout
    enableStreaming: true,
    conversationStorageKey: 'my-chat-conversation',
    onToolCall: (toolCall) => {
      console.log('Tool executed:', toolCall);
    },
  });

  return <AgentUI {...chatProps} />;
}
```

## Utilities

### Stream Processing

```typescript
import {
  DeltaAccumulator,
  parseSSEStream,
} from '@automattic/agenttic-ai-sdk-bridge';

// Create a delta accumulator for smooth streaming updates
const accumulator = new DeltaAccumulator({
  onUpdate: (content) => {
    // Update UI with accumulated content
    console.log('Accumulated text:', content);
  },
  usePacing: true, // Use requestAnimationFrame for smooth updates
});

// Add chunks as they arrive
for await (const chunk of parseSSEStream(response)) {
  accumulator.addChunk(chunk);
}

// Flush any remaining content
accumulator.flush();
```

### Conversation Storage

```typescript
import {
  saveConversation,
  loadConversation,
  clearConversation,
  hasConversation,
} from '@automattic/agenttic-ai-sdk-bridge';

// Save messages to localStorage
saveConversation('my-chat-key', messages);

// Load messages from localStorage
const messages = loadConversation('my-chat-key');

// Check if conversation exists
if (hasConversation('my-chat-key')) {
  // Conversation exists
}

// Clear conversation
clearConversation('my-chat-key');
```

## License

MIT
