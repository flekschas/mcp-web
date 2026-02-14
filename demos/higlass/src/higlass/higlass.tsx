import { HiGlassComponent } from 'higlass';
import { useAtomValue, useAtom } from 'jotai';
import {
  higlassAtom,
  higlassOptionsAtom,
  higlassViewConfigAtom,
} from './states.ts';
import 'higlass/dist/hglib.css';
import { useEffect } from 'react';
import { mcp } from '../mcp/mcp.ts';

export const HiGlass = () => {
  const [higlass, setHiglass] = useAtom(higlassAtom);
  const viewConfig = useAtomValue(higlassViewConfigAtom);
  const options = useAtomValue(higlassOptionsAtom);

  useEffect(
    () => () => {
      setHiglass(undefined);
    },
    [setHiglass],
  );

  useEffect(() => {
    if (!higlass) return;

    // For HiGlass, we need to use the internal PNG exporter instead of
    // MCP-Web's screenshot tool because the WebGL-based rendering in HiGlass.
    mcp.addTool({
      name: 'higlass_screenshot',
      description: 'Take a screenshot of the current HiGlass view',
      handler: async () => {
        const blob: Blob = await higlass.createPNGBlobPromise();
        const img = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      },
    });

    return () => {
      mcp.removeTool('higlass_screenshot');
    };
  }, [higlass]);

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
