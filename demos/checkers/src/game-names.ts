const STORAGE_KEY = 'mcp-web-checkers-game-slots';

/**
 * Claims a game name slot from localStorage using the first available index.
 *
 * Slot array: [true, undefined, true] means "Game 1" and "Game 3" are taken,
 * "Game 2" is available.
 *
 * @returns An object with the claimed `name` and a `release` function to free the slot.
 */
export function claimGameName(): { name: string; release: () => void } {
  const slots = getSlots();

  // Find the first empty slot
  let slotIndex = slots.findIndex((slot) => !slot);
  if (slotIndex === -1) {
    slotIndex = slots.length;
  }

  // Claim the slot
  slots[slotIndex] = true;
  setSlots(slots);

  const name = `Game ${slotIndex + 1}`;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const currentSlots = getSlots();
    currentSlots[slotIndex] = false;
    // Trim trailing empty slots
    while (currentSlots.length > 0 && !currentSlots[currentSlots.length - 1]) {
      currentSlots.pop();
    }
    setSlots(currentSlots);
  };

  // Safety net: release on page unload (covers tab close, navigation, etc.)
  globalThis.addEventListener?.('beforeunload', release);

  return { name, release };
}

function getSlots(): boolean[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Corrupted data, start fresh
  }
  return [];
}

function setSlots(slots: boolean[]): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(slots));
}
