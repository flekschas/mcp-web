import type { HiGlassComponent } from 'higlass';
import { atom } from 'jotai';
import { colorSchemeAtom } from '../app/states.ts';
import {
  DEFAULT_HIGLASS_OPTIONS,
  HIGLASS_DEFAULT_VIEW_CONFIG,
} from './constants.ts';
import { higlassGeneAnnotationTilesetInfoSchema } from './schemas/others.ts';
import { baseTrackSchema } from './schemas/view-config.ts';
import type {
  ChromosomeInfo,
  HiGlassTileset,
  HiglassOptions,
  HiglassViewConfig,
} from './types.ts';

export const higlassAtom = atom<HiGlassComponent | undefined>(undefined);

export const higlassViewConfigAtom = atom<HiglassViewConfig>(
  HIGLASS_DEFAULT_VIEW_CONFIG,
);

export const higlassOptionsAtom = atom<Partial<HiglassOptions>>((get) => {
  const colorScheme = get(colorSchemeAtom);

  return {
    ...DEFAULT_HIGLASS_OPTIONS,
    theme: colorScheme === 'dark' ? 'dark' : 'light',
  };
});

export const higlassTilesetsAtom = atom<Promise<HiGlassTileset[]>>(
  async (get) => {
    const { trackSourceServers } = get(higlassViewConfigAtom);

    if (!trackSourceServers?.length) {
      return [];
    }

    const tilesets = await Promise.all(
      trackSourceServers.map(async (server) => {
        const tilesetsRequest = await fetch(
          `${server}/tilesets/?limit=10000&dt=axis&dt=matrix&dt=vector&dt=multivec&dt=bed-value&dt=stacked-interval&dt=1d-projection&dt=gene-annotation&dt=2d-rectangle-domains&dt=nothing&dt=chromsizes&dt=bedlike`,
        );
        const tilesets = await tilesetsRequest.json();
        return tilesets.results.map((tileset: HiGlassTileset) => {
          return {
            ...tileset,
            name: tileset.name.toLowerCase(),
            description: tileset.description.toLowerCase(),
          }
        });
      }),
    );

    return tilesets.flat();
  },
);

export const higlassChromosomeInfoByViewAtom = atom<
  Promise<Record<string, ChromosomeInfo>>
>(async (get) => {
  const { views } = get(higlassViewConfigAtom);

  const chromosomeInfosByView: Record<string, ChromosomeInfo> = {};

  for (const view of views) {
    if (!view.uid) {
      continue;
    }

    const allTracks = [
      ...(view.tracks?.top ?? []),
      ...(view.tracks?.bottom ?? []),
      ...(view.tracks?.left ?? []),
      ...(view.tracks?.right ?? []),
      ...(view.tracks?.center ?? []),
    ];

    const geneAnnotationTracks = Array.from(
      new Map(
        allTracks.flatMap((track) => {
          const parsedTrack = baseTrackSchema.safeParse(track);
          if (
            parsedTrack.success &&
            (parsedTrack.data.type === 'horizontal-gene-annotations' ||
              parsedTrack.data.type === 'vertical-gene-annotations' ||
              parsedTrack.data.type === 'gene-annotations')
          ) {
            return [[parsedTrack.data.tilesetUid, parsedTrack.data]];
          }
          return [];
        }),
      ).values(),
    );

    const tilesetUid = geneAnnotationTracks[0]?.tilesetUid;

    if (!tilesetUid) {
      continue;
    }

    const response = await fetch(
      `https://higlass.io/api/v1/tileset_info/?d=${tilesetUid}`,
    );
    const responseData = await response.json();

    const parsedResponseData =
      higlassGeneAnnotationTilesetInfoSchema.safeParse(responseData);

    if (!parsedResponseData.success) {
      console.error(
        'Invalid tileset info response for tileset',
        tilesetUid,
        parsedResponseData.error,
      );
      continue;
    }

    const data = parsedResponseData.data[tilesetUid];

    const chromosomeNames: string[] = data.chrom_names.split('\t');
    const chromosomeSizes: number[] = data.chrom_sizes.split('\t').map(Number);

    let absoluteStart = 0;
    const chromosomeInfo: ChromosomeInfo = {};

    chromosomeNames.forEach((name, index) => {
      const size = chromosomeSizes[index];

      chromosomeInfo[name] = {
        size,
        absoluteStart,
        index,
      };

      absoluteStart += size;
    });

    chromosomeInfosByView[view.uid] = chromosomeInfo;
  }

  return chromosomeInfosByView;
});

export const higlassDefaultChromosomeInfoAtom = atom<
  Promise<ChromosomeInfo | undefined>
>(async (get) => {
  const { views } = get(higlassViewConfigAtom);

  if (!views.length || !views[0].uid) {
    return undefined;
  }

  const chromosomeInfosByView = await get(higlassChromosomeInfoByViewAtom);
  const chromosomeInfo = chromosomeInfosByView[views[0].uid];

  return chromosomeInfo;
});
