import type { ElicitationRequest, ElicitationResult } from '@mcp-web/types';
import { useCallback, useEffect, useState } from 'react';
import { useMCPWeb } from './use-mcp-web';

interface Question {
  request: ElicitationRequest;
  respond: (result: ElicitationResult) => void;
}

/** The return value of `useElicitation`. */
export interface UseElicitationResult {
  /**
   * The question a tool handler is waiting on, or `null`. Questions asked at
   * the same time come one after another. A question goes away by itself when
   * nobody waits for its answer any more, for example after a timeout.
   */
  request: ElicitationRequest | null;
  /**
   * Answers the question: `{ action: 'accept', content }` with the fields of
   * `request.requestedSchema`, `{ action: 'decline' }` when the user says no,
   * or `{ action: 'cancel' }` when they dismiss it.
   */
  respond: (result: ElicitationResult) => void;
}

/**
 * Answers the questions tool handlers ask with `elicit` in your own UI, in
 * place of the default dialog. Questions still open when the component
 * unmounts are cancelled.
 *
 * Must be used within MCPWebProvider.
 *
 * @example
 * ```tsx
 * function Confirm() {
 *   const { request, respond } = useElicitation();
 *   if (!request) return null;
 *   return (
 *     <dialog open>
 *       <p>{request.message}</p>
 *       <button onClick={() => respond({ action: 'accept', content: {} })}>
 *         Yes
 *       </button>
 *       <button onClick={() => respond({ action: 'decline' })}>No</button>
 *     </dialog>
 *   );
 * }
 * ```
 */
export function useElicitation(): UseElicitationResult {
  const { mcpWeb } = useMCPWeb();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const open = new Set<Question>();
    const removeHandler = mcpWeb.onElicit(
      (request, { signal }) =>
        new Promise<ElicitationResult>((resolve) => {
          const question: Question = {
            request,
            respond: (result) => {
              if (!open.delete(question)) return;
              setQuestions((current) => current.filter((q) => q !== question));
              resolve(result);
            },
          };
          open.add(question);
          setQuestions((current) => [...current, question]);
          // Nobody waits for the answer any more.
          signal.addEventListener('abort', () =>
            question.respond({ action: 'cancel' }),
          );
        }),
    );
    return () => {
      removeHandler();
      for (const question of open) question.respond({ action: 'cancel' });
    };
  }, [mcpWeb]);

  const current = questions[0];
  const respond = useCallback(
    (result: ElicitationResult) => current?.respond(result),
    [current],
  );
  return { request: current?.request ?? null, respond };
}
