import type { z } from 'zod';
import type {
  ContextItemSchema,
  EphemeralContextSchema,
  QueryRequestSchema,
  QueryResponseAcceptedSchema,
  QueryResponseCompleteSchema,
  QueryResponseFailureSchema,
  QueryResponseProgressSchema,
  QueryResponseSchema,
} from './schemas.js';

export type QueryResponse = z.infer<typeof QueryResponseSchema>;
export type QueryRequestInput = z.input<typeof QueryRequestSchema>;
export type QueryResponseAccepted = z.infer<typeof QueryResponseAcceptedSchema>;
export type QueryResponseProgress = z.infer<typeof QueryResponseProgressSchema>;
export type QueryResponseComplete = z.infer<typeof QueryResponseCompleteSchema>;
export type QueryResponseFailure = z.infer<typeof QueryResponseFailureSchema>;
export type QueryRequest = z.infer<typeof QueryRequestSchema>;
export type ContextItem = z.infer<typeof ContextItemSchema>;
export type EphemeralContext = z.infer<typeof EphemeralContextSchema>;
