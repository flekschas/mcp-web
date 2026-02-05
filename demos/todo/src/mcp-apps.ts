import { createApp } from '@mcp-web/app';
import { getDefaultStore } from 'jotai';
import { Statistics, StatisticsPropsSchema } from './components/Statistics';
import { statisticsAtom } from './states';

const store = getDefaultStore();

/**
 * Statistics MCP App - displays todo completion statistics.
 *
 * When AI calls this tool, it returns props that are rendered
 * in a visual UI component inside Claude Desktop.
 */
export const statisticsApp = createApp({
  name: 'statistics',
  description:
    'Show a dashboard of plots and charts of the todo statistics including completion rates, todos by project, and recently completed items. Use this when the user wants to explore and visualize the statistics.',
  component: Statistics,
  propsSchema: StatisticsPropsSchema,
  handler: () => store.get(statisticsAtom),
});
