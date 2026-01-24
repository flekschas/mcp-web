import { HiGlassComponent } from 'higlass';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  higlassAtom,
  higlassOptionsAtom,
  higlassViewConfigAtom,
} from './states.ts';
import 'higlass/dist/hglib.css';
import { useEffect } from 'react';

export const HiGlass = () => {
  const setHiglass = useSetAtom(higlassAtom);
  const viewConfig = useAtomValue(higlassViewConfigAtom);
  const options = useAtomValue(higlassOptionsAtom);

  useEffect(
    () => () => {
      setHiglass(undefined);
    },
    [setHiglass],
  );

  return (
    <div id="higlass-container" className="absolute inset-4">
      <HiGlassComponent
        ref={(hgc) => {
          setHiglass(hgc || undefined);
        }}
        viewConfig={structuredClone(viewConfig)}
        options={options}
      />
    </div>
  );
};
