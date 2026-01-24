import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

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

export const helpModalOpenAtom = atom(!isDismissed);
