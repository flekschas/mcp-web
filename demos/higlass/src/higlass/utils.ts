import { getDefaultStore } from 'jotai';
import { higlassAtom } from './states.ts';

/**
 * Get the data currently displayed in the HiGlass component.
 */
export const getCurrentViewDataset = (): Record<string, unknown> => {
  const hgc = getDefaultStore().get(higlassAtom);

  if (!hgc) {
    return {};
  }

  const viewConfig = hgc.api.getViewConfig();

  const dataset: Record<string, unknown> = {};

  for (const view of viewConfig.views) {
    const allTracks = [
      ...(view.tracks?.top ?? []),
      ...(view.tracks?.bottom ?? []),
      ...(view.tracks?.left ?? []),
      ...(view.tracks?.right ?? []),
      ...(view.tracks?.center ?? []),
    ];
    for (const track of allTracks) {
      if (!track.uid) continue;
      const trackObj = hgc.api.getTrackObject(view.uid, track.uid);
      dataset[`${view.uid}.${track.uid}`] = trackObj?.fetchedTiles;
    }
  }

  return dataset;
};
