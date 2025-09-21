import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { observe } from 'jotai-effect';

const DARK = '(prefers-color-scheme: dark)';

const preferredColorSchemeAtom = atom<'dark' | 'light'>(
  window?.matchMedia?.(DARK)?.matches ? 'dark' : 'light',
);

observe((_get, set) => {
  if (!window?.matchMedia) {
    return;
  }

  const handleChange = ({ matches }: MediaQueryListEvent) => {
    set(preferredColorSchemeAtom, matches ? 'dark' : 'light');
  };

  const mql = window?.matchMedia(DARK);
  mql.addEventListener('change', handleChange);

  return () => {
    mql.removeEventListener('change', handleChange);
  };
});

export const userColorSchemeAtom = atomWithStorage<'auto' | 'dark' | 'light'>(
  'color-scheme',
  'auto',
);

export const colorSchemeAtom = atom<'dark' | 'light'>((get) => {
  const userColorScheme = get(userColorSchemeAtom);

  if (userColorScheme === 'auto') {
    return get(preferredColorSchemeAtom);
  }

  return userColorScheme;
});
