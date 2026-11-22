import { atom } from 'jotai';
import { mcp } from './mcp';

type McpStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const currentStatus = (): McpStatus => {
  if (mcp.connected) return 'connected';
  return mcp.connecting ? 'connecting' : 'disconnected';
};

/** The status of the bridge connection. Connects when first used. */
export const mcpStatusAtom = atom<McpStatus>('connecting');

mcpStatusAtom.onMount = (setStatus) => {
  const unsubscribe = mcp.onConnectionStateChange(() =>
    setStatus(currentStatus()),
  );
  mcp.connect().then(
    () => setStatus(currentStatus()),
    () => setStatus('error'),
  );
  return unsubscribe;
};
