import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { mcp } from '../mcp/mcp.ts';

// Track whether the help modal has been dismissed
export const helpModalDismissedAtom = atomWithStorage<boolean | undefined>(
  'mcp-help-modal-dismissed',
  false,
  undefined,
  {
    getOnInit: true,
  },
);

const isDismissed = getDefaultStore().get(helpModalDismissedAtom);

// The help explains how to connect AI, which the view in a chat already is.
export const helpModalOpenAtom = atom(!isDismissed && !mcp.isMCPApp);
