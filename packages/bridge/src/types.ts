import type {
  McpRequestMetaParams,
  QueryAcceptedMessage,
  QueryCancelMessage,
  QueryCompleteBridgeMessage,
  QueryCompleteClientMessage,
  QueryFailureMessage,
  QueryMessage,
  QueryProgressMessage,
  ToolMetadata
} from '@mcp-web/types';
import type * as WS from 'ws';
import type { z } from 'zod';

export interface AuthenticateMessage {
  type: 'authenticate';
  sessionId: string;
  authToken: string;
  origin: string;
  pageTitle?: string;
  userAgent?: string;
  timestamp: number;
}

export interface AuthenticatedMessage {
  type: 'authenticated';
  mcpPort?: number;
  sessionId: string;
  success: boolean;
}

export interface RegisterToolMessage {
  type: 'register-tool';
  tool: {
    name: string;
    description: string;
    inputSchema?: z.core.JSONSchema.JSONSchema;
    outputSchema?: z.core.JSONSchema.JSONSchema;
  };
}

export interface ActivityMessage {
  type: 'activity';
  timestamp: number;
}

export interface ToolCallMessage {
  type: 'tool-call';
  requestId: string;
  toolName: string;
  toolInput?: Record<string, unknown>;
  queryId?: string; // Added for query context
}

export interface ToolResponseMessage {
  type: 'tool-response';
  requestId: string;
  result: unknown;
}

export type FrontendMessage =
  | AuthenticateMessage
  | RegisterToolMessage
  | ActivityMessage
  | ToolResponseMessage
  | QueryMessage
  | QueryCompleteClientMessage
  | QueryProgressMessage
  | QueryCancelMessage;

export type BridgeMessage =
  | AuthenticatedMessage
  | ToolCallMessage
  | QueryAcceptedMessage
  | QueryProgressMessage
  | QueryCompleteBridgeMessage
  | QueryFailureMessage
  | QueryCancelMessage;

export interface TrackedToolCall {
  tool: string;
  arguments: unknown;
  result: unknown;
}

export type QueryState = 'active' | 'completed' | 'failed' | 'cancelled';

export interface QueryTracking {
  sessionId: string;
  responseTool?: string;
  toolCalls: TrackedToolCall[];
  ws: WS.WebSocket;
  state: QueryState;
  tools?: ToolMetadata[];
  restrictTools?: boolean;
}

export interface McpRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: McpRequestMetaParams;
  };
}

export interface McpResponse {
  jsonrpc: string;
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: z.core.JSONSchema.JSONSchema;
  outputSchema?: z.core.JSONSchema.JSONSchema;
  handler?: string; // Reference to frontend handler
}

export interface SessionData {
  ws: WS.WebSocket;
  authToken: string;
  origin: string;
  pageTitle?: string;
  userAgent?: string;
  connectedAt: number;
  lastActivity: number;
  tools: Map<string, ToolDefinition>;
}
