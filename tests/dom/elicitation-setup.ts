import { z } from 'zod';
import { createElicit } from '../../packages/core/src/elicitation';
import { askInDialog } from '../../packages/core/src/elicitation-dialog';

/** `elicit` answered in the default dialog, exposed for Playwright. */
const elicit = createElicit(askInDialog);

const RegionSchema = z.object({
  chrom: z.enum(['chr1', 'chr2']).describe('Chromosome'),
  start: z.number().default(0),
  email: z.email(),
  visible: z.boolean(),
  tracks: z.array(z.enum(['genes', 'peaks'])),
});

const TracksSchema = z.object({
  tracks: z.array(z.enum(['genes', 'peaks'])).min(1),
});

/** Fields that once broke the dialog. */
const TrickySchema = z.object({
  append: z.string().default('yes'),
  tags: z
    .array(z.enum(['a', 'b']))
    .min(1)
    .optional(),
  at: z.iso.datetime().default('2026-05-04T12:34:56.789Z'),
});

const controller = new AbortController();

declare global {
  interface Window {
    __elicit: {
      confirm: () => Promise<boolean>;
      choose: () => Promise<string | undefined>;
      region: () => Promise<z.infer<typeof RegionSchema> | undefined>;
      tracks: () => Promise<z.infer<typeof TracksSchema> | undefined>;
      tricky: () => Promise<z.infer<typeof TrickySchema> | undefined>;
      /** Asks a question that `abort` cancels. */
      abortable: () => Promise<boolean>;
      abort: () => void;
    };
  }
}

window.__elicit = {
  confirm: () => elicit('Delete 12 todos?'),
  choose: () => elicit('Which language?', ['English', 'German']),
  region: () => elicit('Which region?', RegionSchema),
  tracks: () => elicit('Which tracks?', TracksSchema),
  tricky: () => elicit('Anything else?', TrickySchema),
  abortable: () =>
    createElicit((request) => askInDialog(request, controller.signal))(
      'Still there?',
    ),
  abort: () => controller.abort(),
};
