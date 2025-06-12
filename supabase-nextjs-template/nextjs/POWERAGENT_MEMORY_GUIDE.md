# PowerAgent Memory System Guide

## Overview

The PowerAgent memory system is designed to provide flexible, brand-segregated conversation storage with support for multiple agents and sessions. Here's how it works:

## Memory Architecture

### 1. **Brand Segregation**
- All memory is automatically segregated by `brand_id`
- Users can only access memory for brands they own or have shared access to
- Complete data isolation between different brands

### 2. **Agent-Specific Memory**
- Each memory entry is linked to a specific `agent_id`
- Different agents within the same brand have separate memory stores
- Agents cannot access each other's memories unless explicitly designed to do so

### 3. **Session Management**
- Memory is organized by `session_id` for conversation tracking
- Sessions can represent:
  - Individual chat conversations
  - Different user interactions
  - Specific workflows or contexts
  - Time-based groupings

## Memory Organization Patterns

### Pattern 1: User-Based Sessions
```typescript
// Each user gets their own session
const sessionId = `user-${userId}-${Date.now()}`;
```

### Pattern 2: Context-Based Sessions
```typescript
// Different sessions for different contexts
const sessionId = `${agentId}-support-chat-${ticketId}`;
const sessionId = `${agentId}-sales-inquiry-${leadId}`;
```

### Pattern 3: Time-Based Sessions
```typescript
// New session every day/week
const sessionId = `${agentId}-${format(new Date(), 'yyyy-MM-dd')}`;
```

### Pattern 4: Workflow-Based Sessions
```typescript
// Separate sessions for different workflows
const sessionId = `${agentId}-onboarding-${customerId}`;
const sessionId = `${agentId}-data-analysis-${projectId}`;
```

## Memory Scoping Examples

### 1. **Agent-Specific Memory Only**
Each agent only sees its own conversations:
```sql
SELECT * FROM poweragent_memory 
WHERE agent_id = 'specific-agent-id' 
AND brand_id = 'your-brand-id'
ORDER BY created_at DESC;
```

### 2. **Session-Specific Memory**
Retrieve memory for a specific conversation:
```sql
SELECT * FROM poweragent_memory 
WHERE session_id = 'specific-session-id'
AND brand_id = 'your-brand-id'
ORDER BY created_at ASC;
```

### 3. **Cross-Agent Memory Sharing**
If you want agents to share certain memories:
```sql
-- Create a shared session that multiple agents can access
const sharedSessionId = `brand-${brandId}-shared-knowledge`;

-- Agents can read from shared sessions
SELECT * FROM poweragent_memory 
WHERE session_id = 'brand-123-shared-knowledge'
OR (agent_id = 'current-agent-id' AND session_id = 'current-session')
ORDER BY created_at DESC;
```

### 4. **User-Specific Memory Across Agents**
Track a user across different agent interactions:
```sql
SELECT * FROM poweragent_memory 
WHERE user_id = 'specific-user-id'
AND brand_id = 'your-brand-id'
ORDER BY created_at DESC;
```

## Implementation Examples

### Basic Memory Storage
```typescript
// Store a conversation message
await supabase.from('poweragent_memory').insert({
  agent_id: agentId,
  brand_id: brandId,
  user_id: userId,
  session_id: sessionId,
  role: 'user',
  content: userMessage,
  metadata: {
    timestamp: new Date().toISOString(),
    source: 'web-chat'
  }
});
```

### Retrieving Session Memory
```typescript
// Get all messages for current session
const { data: messages } = await supabase
  .from('poweragent_memory')
  .select('*')
  .eq('session_id', sessionId)
  .eq('brand_id', brandId)
  .order('created_at', { ascending: true });
```

### Creating Sub-Tables with Metadata
```typescript
// Use metadata to create logical sub-tables
await supabase.from('poweragent_memory').insert({
  agent_id: agentId,
  brand_id: brandId,
  session_id: sessionId,
  role: 'system',
  content: 'Customer data processed',
  metadata: {
    table_type: 'customer_interactions',
    category: 'support',
    priority: 'high',
    tags: ['billing', 'urgent']
  }
});

// Query specific "sub-table"
const { data } = await supabase
  .from('poweragent_memory')
  .select('*')
  .eq('brand_id', brandId)
  .eq('metadata->>table_type', 'customer_interactions')
  .eq('metadata->>category', 'support');
```

## Advanced Features

### 1. **Memory Expiration**
```typescript
// Clean up old sessions
const { error } = await supabase
  .from('poweragent_memory')
  .delete()
  .lt('created_at', thirtyDaysAgo)
  .eq('brand_id', brandId);
```

### 2. **Memory Summarization**
```typescript
// Store summaries for long conversations
if (messageCount > 50) {
  const summary = await generateSummary(messages);
  await supabase.from('poweragent_memory').insert({
    agent_id: agentId,
    brand_id: brandId,
    session_id: `${sessionId}-summary`,
    role: 'system',
    content: summary,
    metadata: { type: 'summary', original_session: sessionId }
  });
}
```

### 3. **Cross-Session Learning**
```typescript
// Extract insights across sessions
const { data: insights } = await supabase
  .from('poweragent_memory')
  .select('content, metadata')
  .eq('brand_id', brandId)
  .eq('metadata->>type', 'insight')
  .order('created_at', { ascending: false })
  .limit(10);
```

## Best Practices

1. **Session Naming Convention**
   - Use descriptive, consistent session IDs
   - Include relevant context (agent, user, purpose)
   - Consider adding timestamps for uniqueness

2. **Memory Cleanup**
   - Implement retention policies
   - Archive old conversations
   - Summarize before deletion

3. **Performance Optimization**
   - Use appropriate indexes
   - Limit memory retrieval to relevant messages
   - Consider pagination for large conversations

4. **Privacy & Security**
   - Never store sensitive data unencrypted
   - Respect user privacy preferences
   - Implement proper access controls

## Memory Retrieval Strategies

### 1. **Recent Context** (Default)
Retrieve the most recent N messages from the current session.

### 2. **Relevant Context**
Use semantic search to find relevant past interactions.

### 3. **Full History**
Load entire conversation history for specific use cases.

### 4. **Cross-Session Context**
Pull relevant information from other sessions when needed.

## Conclusion

The PowerAgent memory system provides flexible, secure, and scalable conversation storage. By leveraging sessions, metadata, and proper querying strategies, you can implement any memory pattern your agents require while maintaining brand segregation and security. 