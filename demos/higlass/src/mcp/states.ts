import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { mcp } from './mcp';

export const mcpAtom = atom(mcp);

export const mcpIsConnectedAsyncAtom = atom((get) => get(mcpAtom).connect());

export const mcpStatusAtom = atom((get) => {
  const loadableState = get(loadable(mcpIsConnectedAsyncAtom));

  if (loadableState.state === 'hasError') {
    return 'error';
  }
  if (loadableState.state === 'hasData') {
    return loadableState.data ? 'connected' : 'disconnected';
  }
  return 'connecting';
});
