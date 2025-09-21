import { z } from 'zod';

export const higlassOptionsSchema = z
  .object({
    authToken: z.string().optional().describe('Auth token for tile requests'),
    bounded: z
      .boolean()
      .optional()
      .describe(
        'Fit component within container div (false = auto-size to content)',
      ),
    editable: z
      .boolean()
      .optional()
      .describe('Allow layout editing (false = hide view headers)'),
    defaultTrackOptions: z
      .object({
        all: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Default options for all track types'),
        trackSpecific: z
          .record(z.string(), z.record(z.string(), z.unknown()))
          .optional()
          .describe('Default options for specific track types'),
      })
      .optional()
      .describe('Default track options for new tracks'),
    viewMarginTop: z
      .number()
      .optional()
      .default(0)
      .describe('Top margin (mouse not tracked here)'),
    viewMarginBottom: z
      .number()
      .optional()
      .default(0)
      .describe('Bottom margin (mouse not tracked here)'),
    viewMarginLeft: z
      .number()
      .optional()
      .default(0)
      .describe('Left margin (mouse not tracked here)'),
    viewMarginRight: z
      .number()
      .optional()
      .default(0)
      .describe('Right margin (mouse not tracked here)'),
    viewPaddingTop: z
      .number()
      .optional()
      .default(5)
      .describe('Top padding (mouse tracked here)'),
    viewPaddingBottom: z
      .number()
      .optional()
      .default(5)
      .describe('Bottom padding (mouse tracked here)'),
    viewPaddingLeft: z
      .number()
      .optional()
      .default(5)
      .describe('Left padding (mouse tracked here)'),
    viewPaddingRight: z
      .number()
      .optional()
      .default(5)
      .describe('Right padding (mouse tracked here)'),
    theme: z
      .enum(['dark', 'light'])
      .optional()
      .default('light')
      .describe("Visual theme: 'dark' or 'light'"),
    mouseTool: z
      .enum(['move', 'select', 'track-select'])
      .optional()
      .describe(
        "Mouse interaction mode: 'move' (pan), 'select' (range), 'track-select' (pick tracks)",
      ),
    pixelPreciseMarginPadding: z
      .boolean()
      .optional()
      .describe('Use exact pixel positioning for margins/padding'),
    sizeMode: z
      .enum(['default', 'bounded', 'overflow', 'bounded-overflow', 'scroll'])
      .optional()
      .describe(
        "Sizing behavior: 'default' (fit tracks), 'bounded' (fit container), 'overflow' (grow), 'scroll' (scrollable)",
      ),
    renderer: z
      .enum(['webgl', 'canvas'])
      .optional()
      .default('webgl')
      .describe("Graphics renderer: 'webgl' (faster) or 'canvas' (compatible)"),
    cheatCodesEnabled: z
      .boolean()
      .optional()
      .describe('Enable keyboard shortcuts for navigation'),
    rangeSelectionOnAlt: z
      .boolean()
      .optional()
      .describe('Enable range selection with Alt+drag'),
    tracksEditable: z
      .boolean()
      .optional()
      .describe('Allow track editing and configuration'),
    zoomFixed: z
      .boolean()
      .optional()
      .describe('Disable zoom controls (lock zoom level)'),
    containerPaddingX: z
      .number()
      .optional()
      .describe('Horizontal container padding'),
    containerPaddingY: z
      .number()
      .optional()
      .describe('Vertical container padding'),
    broadcastMousePositionGlobally: z
      .boolean()
      .optional()
      .describe('Share mouse position with other HiGlass instances'),
    showGlobalMousePosition: z
      .boolean()
      .optional()
      .describe('Display global mouse position indicator'),
    globalMousePosition: z
      .boolean()
      .optional()
      .describe('Enable global mouse position tracking'),
  })
  .partial();
