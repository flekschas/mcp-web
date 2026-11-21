import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { mcp } from './mcp';

export const mcpAtom = atom(mcp);

export const mcpIsConnectedAsyncAtom = atom((get) => get(mcpAtom).connect());

// `undefined` while the connection is pending
const mcpIsConnectedAtom = unwrap(mcpIsConnectedAsyncAtom);

export const mcpStatusAtom = atom((get) => {
  try {
    const isConnected = get(mcpIsConnectedAtom);
    if (isConnected === undefined) {
      return 'connecting';
    }
    return isConnected ? 'connected' : 'disconnected';
  } catch {
    return 'error';
  }
});
